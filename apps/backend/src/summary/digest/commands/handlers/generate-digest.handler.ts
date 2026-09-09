/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import type {
  DigestBlockDto,
  DigestBlockId,
  DigestPayloadDto,
  MailMessageDto,
  SummaryResultDto
} from '@raa/assistant/common';
import type { AppEnv } from '../../../../config/env.js';
import { getAppEnv } from '../../../../config/env.js';
import { MailReadService } from '../../../../mail/mail.read-service.js';
import { LlmProviderRegistryService } from '../../../../provider/llm-provider-registry.service.js';
import { SUMMARY_PROMPT_VERSION } from '../../../summary.service.js';
import { GenerateMessageSummaryCommand } from '../../../commands/generate-message-summary.command.js';
import type { StoredMessageSummary } from '../../../message-summary/message-summary.types.js';
import { GetMessageSummariesByUidsQuery } from '../../../message-summary/queries/get-message-summaries-by-uids.query.js';
import { DigestAggregatorService } from '../../digest-aggregator.service.js';
import { DigestBlockReadyEvent } from '../../events/digest-block-ready.event.js';
import { DigestChartReadyEvent } from '../../events/digest-chart-ready.event.js';
import { DigestCompletedEvent } from '../../events/digest-completed.event.js';
import { DigestContactsReadyEvent } from '../../events/digest-contacts-ready.event.js';
import { DigestFailedEvent } from '../../events/digest-failed.event.js';
import { DigestStatsReadyEvent } from '../../events/digest-stats-ready.event.js';
import { GenerateDigestCommand } from '../generate-digest.command.js';

const ALL_BLOCK_IDS: readonly DigestBlockId[] = [
  'critical',
  'suspicious',
  'severalEmails',
  'invoices',
  'meetings',
  'junkMessages',
  'newEmails',
  'importantEmails',
  'emailsReceived',
  'requiresAttention'
];

const MAX_MESSAGES_PER_DIGEST = 200;
const MAX_RECENT_FOR_STATS = 200;

interface ClassifiedMessage {
  envelope: MailMessageDto;
  summary: SummaryResultDto;
}

@CommandHandler(GenerateDigestCommand)
export class GenerateDigestHandler implements ICommandHandler<GenerateDigestCommand, DigestPayloadDto> {
  private readonly logger = new Logger(GenerateDigestHandler.name);
  private readonly env: AppEnv;

  constructor(
    private readonly mailReadService: MailReadService,
    private readonly aggregator: DigestAggregatorService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly eventBus: EventBus,
    private readonly llmProviderRegistry: LlmProviderRegistryService,
    configService: ConfigService<AppEnv>
  ) {
    this.env = getAppEnv(configService);
  }

  async execute(command: GenerateDigestCommand): Promise<DigestPayloadDto> {
    const generatedAt = new Date().toISOString();
    const startedAt = Date.now();

    try {
      // 1. Three parallel IMAP fetches: unread (for digest content), recent
      //    inbox (for stats blocks), and recent sent (for the chart).
      const [contentEnvelopes, recentEnvelopes, sentEnvelopes] = await Promise.all([
        this.mailReadService.listMessages(command.auth, command.folder, {
          limit: MAX_MESSAGES_PER_DIGEST,
          offset: 0,
          unreadOnly: true
        }),
        this.mailReadService.listMessages(command.auth, command.folder, {
          limit: MAX_RECENT_FOR_STATS,
          offset: 0
        }),
        this.mailReadService.listMessages(command.auth, this.env.sentFolder, {
          limit: MAX_RECENT_FOR_STATS,
          offset: 0
        }).catch(() => [] as MailMessageDto[])
      ]);

      const statsEnvelopes = filterByDays(recentEnvelopes, this.env.digestStatsWindowDays);
      const statsSentEnvelopes = filterByDays(sentEnvelopes, this.env.digestStatsWindowDays);

      // 2. Publish stats / contacts / chart immediately — they only depend
      //    on envelopes, not on the LLM. Keeps the SSE stream alive even if
      //    the per-message LLM phase is slow on a cold cache.
      this.eventBus.publish(
        new DigestStatsReadyEvent(command.userId, contentEnvelopes.length, generatedAt)
      );
      this.eventBus.publish(
        new DigestContactsReadyEvent(command.userId, this.aggregator.topContacts(statsEnvelopes))
      );
      this.eventBus.publish(
        new DigestChartReadyEvent(command.userId, this.aggregator.sentReceivedSeries(statsEnvelopes, statsSentEnvelopes))
      );

      // 3. Bulk-load every cached summary in a single DB roundtrip. Avoids
      //    the per-message IMAP fetchOne the hash-based cache validation
      //    used to require — see GetMessageSummariesByUidsQuery for the
      //    rationale of skipping body-hash invalidation here.
      const resolved = this.llmProviderRegistry.resolveRequestOptions(command.llm);
      const cachedMap = await this.queryBus.execute<
        GetMessageSummariesByUidsQuery,
        Map<string, StoredMessageSummary>
      >(
        new GetMessageSummariesByUidsQuery(
          command.userId,
          command.folder,
          contentEnvelopes.map((envelope) => envelope.uid),
          SUMMARY_PROMPT_VERSION,
          resolved.model,
          resolved.provider
        )
      );

      const cached: ClassifiedMessage[] = [];
      const fresh: MailMessageDto[] = [];

      for (const envelope of contentEnvelopes) {
        const stored = cachedMap.get(envelope.uid);

        if (stored) {
          cached.push({ envelope, summary: stored.payload });
        } else {
          fresh.push(envelope);
        }
      }

      // 4. Build blocks from all cached L1 summaries.
      //    Enrichment endpoint should have been called first, so most/all
      //    messages should be in L1 cache. Any misses are skipped gracefully.
      const classified: ClassifiedMessage[] = [...cached];

      if (fresh.length > 0) {
        this.logger.debug(
          `digest user=${command.userId} skipping ${fresh.length} unenriched messages (enrichment may not have run yet)`
        );
      }

      this.publishBlocks(command.userId, this.aggregator.buildBlocks(classified));

      this.logger.debug(
        `digest user=${command.userId} completed in ${Date.now() - startedAt}ms (${classified.length} classified)`
      );

      this.eventBus.publish(new DigestCompletedEvent(command.userId));

      this.logger.debug(
        `digest user=${command.userId} completed in ${Date.now() - startedAt}ms (${classified.length} classified)`
      );

      return {
        blocks: this.aggregator.buildBlocks(classified),
        topContacts: this.aggregator.topContacts(statsEnvelopes),
        sentReceived: this.aggregator.sentReceivedSeries(statsEnvelopes, statsSentEnvelopes),
        generatedAt,
        totalProcessed: contentEnvelopes.length
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown digest failure';

      this.logger.error(`Digest generation failed for user=${command.userId}: ${message}`);
      this.eventBus.publish(new DigestFailedEvent(command.userId, message));
      throw error;
    }
  }

  private publishBlocks(userId: string, blocks: Record<DigestBlockId, DigestBlockDto>): void {
    for (const blockId of ALL_BLOCK_IDS) {
      this.eventBus.publish(new DigestBlockReadyEvent(userId, blockId, blocks[blockId]));
    }
  }
}

function filterByDays(envelopes: MailMessageDto[], days: number): MailMessageDto[] {
  if (days <= 0) {
    return envelopes;
  }

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return envelopes.filter((envelope) => new Date(envelope.receivedAt).getTime() >= cutoff);
}
