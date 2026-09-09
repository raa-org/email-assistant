/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import type { SummaryResultDto } from '@raa/assistant/common';
import { createHash } from 'node:crypto';
import { MailReadService } from '../../../mail/mail.read-service.js';
import { LlmProviderRegistryService } from '../../../provider/llm-provider-registry.service.js';
import { MessageSummaryGeneratedEvent } from '../../events/message-summary-generated.event.js';
import { StoreMessageSummaryCommand } from '../../message-summary/commands/store-message-summary.command.js';
import type { StoredMessageSummary } from '../../message-summary/message-summary.types.js';
import { GetMessageSummaryQuery } from '../../message-summary/queries/get-message-summary.query.js';
import { SUMMARY_PROMPT_VERSION, SummaryService } from '../../summary.service.js';
import { GenerateMessageSummaryCommand } from '../generate-message-summary.command.js';

@CommandHandler(GenerateMessageSummaryCommand)
export class GenerateMessageSummaryHandler implements ICommandHandler<GenerateMessageSummaryCommand, SummaryResultDto> {
  private readonly logger = new Logger(GenerateMessageSummaryHandler.name);

  constructor(
    private readonly summaryService: SummaryService,
    private readonly mailReadService: MailReadService,
    private readonly llmProviderRegistry: LlmProviderRegistryService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: GenerateMessageSummaryCommand): Promise<SummaryResultDto> {
    const message = await this.mailReadService.getMessage(command.auth, command.folder, command.uid);
    const bodyHash = hashBody(message.bodyText);
    const resolved = this.llmProviderRegistry.resolveRequestOptions(command.llm);

    const stored = await this.queryBus.execute<GetMessageSummaryQuery, StoredMessageSummary | null>(
      new GetMessageSummaryQuery(
        command.userId,
        command.folder,
        command.uid,
        bodyHash,
        SUMMARY_PROMPT_VERSION,
        resolved.model,
        resolved.provider
      )
    );

    if (stored) {
      this.logger.debug(`cache hit user=${command.userId} folder=${command.folder} uid=${command.uid}`);
      this.eventBus.publish(new MessageSummaryGeneratedEvent(command.uid, stored.payload));
      return stored.payload;
    }

    const result = await this.summaryService.summarizeMessage(message, command.llm);

    await this.commandBus.execute(
      new StoreMessageSummaryCommand(
        command.userId,
        command.folder,
        command.uid,
        bodyHash,
        SUMMARY_PROMPT_VERSION,
        resolved.model,
        resolved.provider,
        result
      )
    );

    this.eventBus.publish(new MessageSummaryGeneratedEvent(command.uid, result));
    return result;
  }
}

function hashBody(bodyText: string): string {
  return createHash('sha256').update(bodyText, 'utf8').digest('hex');
}
