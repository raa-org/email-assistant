/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus, EventBus, EventsHandler, type IEventHandler } from '@nestjs/cqrs';
import { createHash } from 'node:crypto';
import type { AppEnv } from '../../../../config/env.js';
import { getAppEnv } from '../../../../config/env.js';
import { StoreMessageSummaryCommand } from '../../../message-summary/commands/store-message-summary.command.js';
import { SUMMARY_PROMPT_VERSION, SummaryService } from '../../../summary.service.js';
import { MessageBodyFetchedEvent } from '../message-body-fetched.event.js';
import { MessageEnrichedEvent } from '../message-enriched.event.js';

@EventsHandler(MessageBodyFetchedEvent)
export class MessageBodyFetchedHandler implements IEventHandler<MessageBodyFetchedEvent> {
  private readonly logger = new Logger(MessageBodyFetchedHandler.name);
  private readonly maxConcurrency: number;
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(
    private readonly summaryService: SummaryService,
    private readonly commandBus: CommandBus,
    private readonly eventBus: EventBus,
    configService: ConfigService<AppEnv>
  ) {
    this.maxConcurrency = getAppEnv(configService).llmEnrichmentConcurrency;
  }

  async handle(event: MessageBodyFetchedEvent): Promise<void> {
    if (this.maxConcurrency > 0) {
      await this.acquireSlot();
    }

    try {
      await this.enrich(event);
    } finally {
      if (this.maxConcurrency > 0) {
        this.releaseSlot();
      }
    }
  }

  private async enrich(event: MessageBodyFetchedEvent): Promise<void> {
    try {
      const bodyHash = createHash('sha256').update(event.message.bodyText, 'utf8').digest('hex');
      const summary = await this.summaryService.summarizeMessage(event.message);

      await this.commandBus.execute(
        new StoreMessageSummaryCommand(
          event.userId,
          event.envelope.folder,
          event.envelope.uid,
          bodyHash,
          SUMMARY_PROMPT_VERSION,
          event.llmModel,
          event.llmProvider,
          summary
        )
      );

      this.eventBus.publish(
        new MessageEnrichedEvent(event.userId, event.correlationId, event.envelope, summary)
      );
    } catch (error) {
      this.logger.warn(
        `Enrichment failed for ${event.envelope.folder}/${event.envelope.uid}: ${error instanceof Error ? error.message : error}`
      );

      const message = error instanceof Error ? error.message : String(error);
      this.eventBus.publish(
        new MessageEnrichedEvent(event.userId, event.correlationId, event.envelope, null, message)
      );
    }
  }

  private acquireSlot(): Promise<void> {
    if (this.running < this.maxConcurrency) {
      this.running++;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.running++;
        resolve();
      });
    });
  }

  private releaseSlot(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.running--;
    }
  }
}
