/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EncryptionService } from '../../../../../encryption/encryption.service.js';
import { BRIEFING_ENCRYPTION_CONTEXT } from '../../briefing.constants.js';
import { BriefingEntity } from '../../briefing.entity.js';
import { StoreBriefingCommand } from '../store-briefing.command.js';

@CommandHandler(StoreBriefingCommand)
export class StoreBriefingHandler implements ICommandHandler<StoreBriefingCommand, void> {
  constructor(
    @InjectRepository(BriefingEntity)
    private readonly repository: Repository<BriefingEntity>,
    private readonly encryptionService: EncryptionService
  ) {}

  async execute(command: StoreBriefingCommand): Promise<void> {
    const envelope = this.encryptionService.encrypt(
      command.userId,
      JSON.stringify(command.payload),
      BRIEFING_ENCRYPTION_CONTEXT
    );

    await this.repository.save(
      this.repository.create({
        userId: command.userId,
        folder: command.folder,
        kind: command.kind,
        dateFrom: command.dateFrom,
        dateTo: command.dateTo,
        type: command.type,
        messageCount: command.messageCount,
        uidsHash: command.uidsHash,
        llmParamsHash: command.llmParamsHash,
        payloadEncrypted: JSON.stringify(envelope),
        llmModel: command.llmModel,
        llmProvider: command.llmProvider,
        generatedAt: new Date()
      })
    );
  }
}
