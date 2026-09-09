/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageSummaryEntity } from '../../message-summary.entity.js';
import { InvalidateMessageSummaryCommand } from '../invalidate-message-summary.command.js';

@CommandHandler(InvalidateMessageSummaryCommand)
export class InvalidateMessageSummaryHandler implements ICommandHandler<InvalidateMessageSummaryCommand, number> {
  constructor(
    @InjectRepository(MessageSummaryEntity)
    private readonly summaryRepository: Repository<MessageSummaryEntity>
  ) {}

  async execute(command: InvalidateMessageSummaryCommand): Promise<number> {
    const result = await this.summaryRepository.delete(
      command.messageUid
        ? {
            userId: command.userId,
            folder: command.folder,
            messageUid: command.messageUid
          }
        : {
            userId: command.userId,
            folder: command.folder
          }
    );

    return result.affected ?? 0;
  }
}
