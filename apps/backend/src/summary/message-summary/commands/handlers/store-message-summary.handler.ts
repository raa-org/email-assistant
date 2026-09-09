/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EncryptionService } from '../../../../encryption/encryption.service.js';
import { MessageSummaryStoredEvent } from '../../events/message-summary-stored.event.js';
import { MESSAGE_SUMMARY_ENCRYPTION_CONTEXT } from '../../message-summary.constants.js';
import { MessageSummaryEntity } from '../../message-summary.entity.js';
import { StoreMessageSummaryCommand } from '../store-message-summary.command.js';

@CommandHandler(StoreMessageSummaryCommand)
export class StoreMessageSummaryHandler implements ICommandHandler<StoreMessageSummaryCommand, void> {
  constructor(
    @InjectRepository(MessageSummaryEntity)
    private readonly summaryRepository: Repository<MessageSummaryEntity>,
    private readonly encryptionService: EncryptionService,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: StoreMessageSummaryCommand): Promise<void> {
    const envelope = this.encryptionService.encrypt(
      command.userId,
      JSON.stringify(command.payload),
      MESSAGE_SUMMARY_ENCRYPTION_CONTEXT
    );

    await this.summaryRepository.save(
      this.summaryRepository.create({
        userId: command.userId,
        folder: command.folder,
        messageUid: command.messageUid,
        bodyHash: command.bodyHash,
        promptVersion: command.promptVersion,
        payloadEncrypted: JSON.stringify(envelope),
        llmModel: command.llmModel,
        llmProvider: command.llmProvider,
        generatedAt: new Date()
      })
    );

    this.eventBus.publish(
      new MessageSummaryStoredEvent(
        command.userId,
        command.folder,
        command.messageUid,
        command.llmModel,
        command.llmProvider
      )
    );
  }
}
