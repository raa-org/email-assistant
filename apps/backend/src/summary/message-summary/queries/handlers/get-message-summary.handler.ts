/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import type { SummaryResultDto } from '@raa/assistant/common';
import { Repository } from 'typeorm';
import { EncryptionService } from '../../../../encryption/encryption.service.js';
import type { EncryptedPayload } from '../../../../encryption/encryption.types.js';
import { MESSAGE_SUMMARY_ENCRYPTION_CONTEXT } from '../../message-summary.constants.js';
import { MessageSummaryEntity } from '../../message-summary.entity.js';
import type { StoredMessageSummary } from '../../message-summary.types.js';
import { GetMessageSummaryQuery } from '../get-message-summary.query.js';

@QueryHandler(GetMessageSummaryQuery)
export class GetMessageSummaryHandler implements IQueryHandler<GetMessageSummaryQuery, StoredMessageSummary | null> {
  constructor(
    @InjectRepository(MessageSummaryEntity)
    private readonly summaryRepository: Repository<MessageSummaryEntity>,
    private readonly encryptionService: EncryptionService
  ) {}

  async execute(query: GetMessageSummaryQuery): Promise<StoredMessageSummary | null> {
    const row = await this.summaryRepository.findOne({
      where: {
        userId: query.userId,
        folder: query.folder,
        messageUid: query.messageUid
      }
    });

    if (!row) {
      return null;
    }

    if (
      row.bodyHash !== query.bodyHash ||
      row.promptVersion !== query.promptVersion ||
      row.llmModel !== query.llmModel ||
      row.llmProvider !== query.llmProvider
    ) {
      // Stale row — caller will overwrite via StoreMessageSummaryCommand on the next call.
      return null;
    }

    const payload = decryptPayload(this.encryptionService, query.userId, row.payloadEncrypted);

    return {
      payload,
      generatedAt: row.generatedAt,
      promptVersion: row.promptVersion,
      llmModel: row.llmModel,
      llmProvider: row.llmProvider
    };
  }
}

function decryptPayload(
  encryption: EncryptionService,
  userId: string,
  payloadEncrypted: string
): SummaryResultDto {
  const envelope = JSON.parse(payloadEncrypted) as EncryptedPayload;
  const json = encryption.decrypt(userId, envelope, MESSAGE_SUMMARY_ENCRYPTION_CONTEXT);

  return JSON.parse(json) as SummaryResultDto;
}
