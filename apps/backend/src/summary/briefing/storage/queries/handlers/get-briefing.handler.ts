/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AppEnv } from '../../../../../config/env.js';
import { getAppEnv } from '../../../../../config/env.js';
import { EncryptionService } from '../../../../../encryption/encryption.service.js';
import type { EncryptedPayload } from '../../../../../encryption/encryption.types.js';
import { BRIEFING_ENCRYPTION_CONTEXT } from '../../briefing.constants.js';
import { BriefingEntity } from '../../briefing.entity.js';
import { GetBriefingQuery } from '../get-briefing.query.js';

@QueryHandler(GetBriefingQuery)
export class GetBriefingHandler implements IQueryHandler<GetBriefingQuery, unknown | null> {
  private readonly logger = new Logger(GetBriefingHandler.name);
  private readonly ttlMinutes: number;

  constructor(
    @InjectRepository(BriefingEntity)
    private readonly repository: Repository<BriefingEntity>,
    private readonly encryptionService: EncryptionService,
    configService: ConfigService<AppEnv>
  ) {
    this.ttlMinutes = getAppEnv(configService).briefingCacheTtlMinutes;
  }

  async execute(query: GetBriefingQuery): Promise<unknown | null> {
    const row = await this.repository.findOne({
      where: {
        userId: query.userId,
        folder: query.folder,
        kind: query.kind,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        type: query.type
      }
    });

    if (!row) {
      this.logger.debug(`briefing MISS (no row) type=${query.type} kind=${query.kind}`);
      return null;
    }

    if (
      row.messageCount !== query.messageCount ||
      row.uidsHash !== query.uidsHash ||
      row.llmParamsHash !== query.llmParamsHash
    ) {
      this.logger.debug(
        `briefing MISS (stale) type=${query.type} kind=${query.kind} ` +
        `row=[count=${row.messageCount} hash=${row.uidsHash.slice(0, 8)} params=${row.llmParamsHash.slice(0, 8)}] ` +
        `query=[count=${query.messageCount} hash=${query.uidsHash.slice(0, 8)} params=${query.llmParamsHash.slice(0, 8)}]`
      );
      return null;
    }

    const ageMs = Date.now() - row.generatedAt.getTime();
    if (ageMs > this.ttlMinutes * 60 * 1000) {
      this.logger.debug(`briefing MISS (expired, age=${Math.round(ageMs / 1000)}s) type=${query.type}`);
      return null;
    }

    try {
      const envelope = JSON.parse(row.payloadEncrypted) as EncryptedPayload;
      const json = this.encryptionService.decrypt(query.userId, envelope, BRIEFING_ENCRYPTION_CONTEXT);

      this.logger.debug(`briefing HIT type=${query.type} kind=${query.kind}`);
      return JSON.parse(json) as unknown;
    } catch {
      this.logger.warn(`briefing decrypt failed type=${query.type} — treating as miss`);
      return null;
    }
  }
}
