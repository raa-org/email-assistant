/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus, CommandHandler, EventBus, QueryBus, type ICommandHandler } from '@nestjs/cqrs';
import type { MailMessageDetailDto, MailMessageDto, PeriodSummaryResultDto, SummaryResultDto } from '@raa/assistant/common';
import { createHash } from 'node:crypto';
import type { MailAuthContext } from '../../../../mail/mail.types.js';
import type { AppEnv } from '../../../../config/env.js';
import { getAppEnv } from '../../../../config/env.js';
import { MailReadService } from '../../../../mail/mail.read-service.js';
import { LlmProviderRegistryService } from '../../../../provider/llm-provider-registry.service.js';
import { StoreMessageSummaryCommand } from '../../../message-summary/commands/store-message-summary.command.js';
import type { StoredMessageSummary } from '../../../message-summary/message-summary.types.js';
import { GetMessageSummariesByUidsQuery } from '../../../message-summary/queries/get-message-summaries-by-uids.query.js';
import { SUMMARY_PROMPT_VERSION, SummaryService } from '../../../summary.service.js';
import type { ClassifiedMessage } from '../../../digest/digest-aggregator.service.js';
import { DigestAggregatorService } from '../../../digest/digest-aggregator.service.js';
import { BriefingService } from '../../briefing.service.js';
import { computeLlmParamsHash } from '../../storage/briefing.constants.js';
import { StoreBriefingCommand } from '../../storage/commands/store-briefing.command.js';
import { GetBriefingQuery } from '../../storage/queries/get-briefing.query.js';
import { PeriodSummaryFailedEvent } from '../../events/period-summary-failed.event.js';
import { PeriodSummaryReadyEvent } from '../../events/period-summary-ready.event.js';
import { resolvePeriod } from '../../period-resolver.js';
import { GeneratePeriodSummaryCommand } from '../generate-period-summary.command.js';

@CommandHandler(GeneratePeriodSummaryCommand)
export class GeneratePeriodSummaryHandler implements ICommandHandler<GeneratePeriodSummaryCommand, PeriodSummaryResultDto> {
  private readonly logger = new Logger(GeneratePeriodSummaryHandler.name);
  private readonly env: AppEnv;

  constructor(
    private readonly mailReadService: MailReadService,
    private readonly briefingService: BriefingService,
    private readonly summaryService: SummaryService,
    private readonly aggregator: DigestAggregatorService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly eventBus: EventBus,
    private readonly llmProviderRegistry: LlmProviderRegistryService,
    configService: ConfigService<AppEnv>
  ) {
    this.env = getAppEnv(configService);
  }

  async execute(command: GeneratePeriodSummaryCommand): Promise<PeriodSummaryResultDto> {
    try {
      const resolved = resolvePeriod(command.period, command.unreadOnly);
      const envelopes = await this.mailReadService.listMessages(command.auth, command.folder, {
        limit: this.env.briefingMaxMessages,
        offset: 0,
        since: resolved.since,
        before: resolved.before,
        unreadOnly: resolved.unreadOnly
      });

      const sourceMessageUids = envelopes.map((e) => e.uid);
      const uidsHash = computeUidsHash(sourceMessageUids);
      const resolvedLlm = this.llmProviderRegistry.resolveRequestOptions(command.llm);
      const { model: llmModel, provider: llmProvider } = resolvedLlm;
      const llmParamsHash = computeLlmParamsHash(SUMMARY_PROMPT_VERSION, llmModel, llmProvider, resolvedLlm.parameters);
      const dateFrom = command.period.dateFrom ?? '_';
      const dateTo = command.period.dateTo ?? '_';

      // Check L3 cache (unless force refresh)
      if (!command.force) {
        const cached = await this.queryBus.execute<GetBriefingQuery, PeriodSummaryResultDto | null>(
          new GetBriefingQuery(
            command.userId, command.folder, command.period.kind,
            dateFrom, dateTo, 'summary',
            envelopes.length, uidsHash, llmParamsHash
          )
        );

        if (cached) {
          this.logger.debug(`period-summary cache HIT for user=${command.userId}`);
          this.eventBus.publish(new PeriodSummaryReadyEvent(command.userId, cached as PeriodSummaryResultDto));
          return cached as PeriodSummaryResultDto;
        }
      }

      // L1: Bulk-load cached per-message summaries + generate missing ones
      const classified = await this.ensureL1Enrichment(command.userId, command.folder, envelopes, command.auth, resolvedLlm, command.force);

      // L2: Deterministic aggregation
      const briefingInput = this.aggregator.buildBriefingInput(classified, envelopes);

      // L3: Narrative generation from compact input
      const summary = await this.briefingService.generatePeriodSummary(briefingInput, command.period.kind, command.llm);
      const result: PeriodSummaryResultDto = {
        summary,
        totalMessages: envelopes.length,
        sourceMessageUids,
        period: command.period,
        generatedAt: new Date().toISOString()
      };

      // Store L3 in cache
      await this.commandBus.execute(
        new StoreBriefingCommand(
          command.userId, command.folder, command.period.kind,
          dateFrom, dateTo, 'summary',
          envelopes.length, uidsHash, llmParamsHash, llmModel, llmProvider,
          result
        )
      );

      this.eventBus.publish(new PeriodSummaryReadyEvent(command.userId, result));
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Period summary generation failed';

      this.logger.error(`Period summary failed for user=${command.userId}: ${message}`);
      this.eventBus.publish(new PeriodSummaryFailedEvent(command.userId, message));
      throw error;
    }
  }

  private async ensureL1Enrichment(
    userId: string,
    folder: string,
    envelopes: MailMessageDto[],
    auth: MailAuthContext,
    resolvedLlm: { model: string; provider: string },
    force?: boolean
  ): Promise<ClassifiedMessage[]> {
    const classified: ClassifiedMessage[] = [];
    let fresh: MailMessageDto[];

    if (!force) {
      const cachedMap = await this.queryBus.execute<
        GetMessageSummariesByUidsQuery,
        Map<string, StoredMessageSummary>
      >(
        new GetMessageSummariesByUidsQuery(
          userId, folder,
          envelopes.map((e) => e.uid),
          SUMMARY_PROMPT_VERSION,
          resolvedLlm.model, resolvedLlm.provider
        )
      );

      fresh = [];

      for (const envelope of envelopes) {
        const stored = cachedMap.get(envelope.uid);

        if (stored) {
          classified.push({ envelope, summary: stored.payload });
        } else {
          fresh.push(envelope);
        }
      }

      this.logger.debug(`period-summary L1: cached=${classified.length} fresh=${fresh.length}`);
    } else {
      fresh = envelopes;
    }

    if (fresh.length > 0) {
      const envelopeByUid = new Map(fresh.map((e) => [e.uid, e]));
      const refreshAuth = () => Promise.resolve(auth);

      // Collect fetched bodies, then enrich sequentially
      const fetched: Array<{ envelope: MailMessageDto; message: MailMessageDetailDto }> = [];

      await this.mailReadService.fetchMessagesWithCallback(
        refreshAuth, folder, fresh.map((e) => e.uid),
        (uid, message) => {
          const envelope = envelopeByUid.get(uid);
          if (envelope) {
            fetched.push({ envelope, message });
          }
        }
      );

      for (const { envelope, message } of fetched) {
        try {
          const bodyHash = createHash('sha256').update(message.bodyText, 'utf8').digest('hex');
          const summary = await this.summaryService.summarizeMessage(message);

          await this.commandBus.execute(
            new StoreMessageSummaryCommand(userId, folder, envelope.uid, bodyHash, SUMMARY_PROMPT_VERSION, resolvedLlm.model, resolvedLlm.provider, summary)
          );

          classified.push({ envelope, summary });
        } catch (error) {
          this.logger.warn(`Skipping L1 for ${envelope.folder}/${envelope.uid}: ${error instanceof Error ? error.message : error}`);
        }
      }
    }

    return classified;
  }
}

function computeUidsHash(uids: string[]): string {
  return createHash('sha256').update([...uids].sort().join(','), 'utf8').digest('hex');
}
