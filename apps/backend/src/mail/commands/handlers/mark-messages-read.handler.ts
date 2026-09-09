/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { MessagesMarkedReadEvent } from '../../events/messages-marked-read.event.js';
import { MailWriteService } from '../../mail.write-service.js';
import { MarkMessagesReadCommand } from '../mark-messages-read.command.js';

@CommandHandler(MarkMessagesReadCommand)
export class MarkMessagesReadHandler implements ICommandHandler<MarkMessagesReadCommand, number> {
  constructor(
    private readonly mailWriteService: MailWriteService,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: MarkMessagesReadCommand): Promise<number> {
    const markedCount = await this.mailWriteService.markRead(
      command.auth,
      command.folder,
      command.target
    );

    if (markedCount > 0) {
      this.eventBus.publish(new MessagesMarkedReadEvent(command.folder, markedCount));
    }

    return markedCount;
  }
}
