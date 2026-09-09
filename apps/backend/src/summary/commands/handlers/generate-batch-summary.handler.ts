/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import type { SummaryResultDto } from '@raa/assistant/common';
import { MessageSummaryGeneratedEvent } from '../../events/message-summary-generated.event.js';
import { SummaryService } from '../../summary.service.js';
import { GenerateBatchSummaryCommand } from '../generate-batch-summary.command.js';

@CommandHandler(GenerateBatchSummaryCommand)
export class GenerateBatchSummaryHandler implements ICommandHandler<GenerateBatchSummaryCommand, SummaryResultDto> {
  constructor(
    private readonly summaryService: SummaryService,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: GenerateBatchSummaryCommand): Promise<SummaryResultDto> {
    const result = await this.summaryService.generateBatchSummary(command.auth, command.folder, command.limit, command.llm);
    this.eventBus.publish(new MessageSummaryGeneratedEvent(`batch:${command.folder}`, result));
    return result;
  }
}
