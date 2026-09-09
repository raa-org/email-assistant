/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import type { SummaryResultDto } from '@raa/assistant/common';
import { In, Repository } from 'typeorm';
import { EncryptionService } from '../../../../encryption/encryption.service.js';
import type { EncryptedPayload } from '../../../../encryption/encryption.types.js';
import { MESSAGE_SUMMARY_ENCRYPTION_CONTEXT } from '../../message-summary.constants.js';
import { MessageSummaryEntity } from '../../message-summary.entity.js';
import type { StoredMessageSummary } from '../../message-summary.types.js';
import { GetMessageSummariesByUidsQuery } from '../get-message-summaries-by-uids.query.js';

@QueryHandler(GetMessageSummariesByUidsQuery)
export class GetMessageSummariesByUidsHandler
  implements IQueryHandler<GetMessageSummariesByUidsQuery, Map<string, StoredMessageSummary>>
{
  constructor(
    @InjectRepository(MessageSummaryEntity)
    private readonly summaryRepository: Repository<MessageSummaryEntity>,
    private readonly encryptionService: EncryptionService
  ) {}

  async execute(query: GetMessageSummariesByUidsQuery): Promise<Map<string, StoredMessageSummary>> {
    const result = new Map<string, StoredMessageSummary>();

    if (query.messageUids.length === 0) {
      return result;
    }

    const rows = await this.summaryRepository.find({
      where: {
        userId: query.userId,
        folder: query.folder,
        messageUid: In(query.messageUids),
        promptVersion: query.promptVersion,
        llmModel: query.llmModel,
        llmProvider: query.llmProvider
      }
    });

    for (const row of rows) {
      try {
        const payload = this.decryptPayload(query.userId, row.payloadEncrypted);

        result.set(row.messageUid, {
          payload,
          generatedAt: row.generatedAt,
          promptVersion: row.promptVersion,
          llmModel: row.llmModel,
          llmProvider: row.llmProvider
        });
      } catch {
        // Treat undecryptable rows as misses — caller will overwrite via
        // StoreMessageSummaryCommand on the next run. Common cause: master
        // secret rotated since the row was written.
      }
    }

    return result;
  }

  private decryptPayload(userId: string, payloadEncrypted: string): SummaryResultDto {
    const envelope = JSON.parse(payloadEncrypted) as EncryptedPayload;
    const json = this.encryptionService.decrypt(userId, envelope, MESSAGE_SUMMARY_ENCRYPTION_CONTEXT);

    return JSON.parse(json) as SummaryResultDto;
  }
}
