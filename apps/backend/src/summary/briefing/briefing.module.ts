/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MailModule } from '../../mail/mail.module.js';
import { ProviderModule } from '../../provider/provider.module.js';
import { DigestModule } from '../digest/digest.module.js';
import { LlmSanitizationService } from '../sanitization/llm-sanitization.service.js';
import { SummaryService } from '../summary.service.js';
import { BriefingService } from './briefing.service.js';
import { BriefingStorageModule } from './storage/briefing-storage.module.js';
import { GenerateAgendaHandler } from './commands/handlers/generate-agenda.handler.js';
import { GeneratePeriodSummaryHandler } from './commands/handlers/generate-period-summary.handler.js';

@Module({
  imports: [CqrsModule, MailModule, ProviderModule, BriefingStorageModule, DigestModule],
  providers: [BriefingService, SummaryService, LlmSanitizationService, GeneratePeriodSummaryHandler, GenerateAgendaHandler],
  exports: [BriefingService]
})
export class BriefingModule {}
