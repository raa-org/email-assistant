/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module.js';
import { MailModule } from '../mail/mail.module.js';
import { ProviderModule } from '../provider/provider.module.js';
import { BriefingModule } from './briefing/briefing.module.js';
import { GenerateBatchSummaryHandler } from './commands/handlers/generate-batch-summary.handler.js';
import { GenerateMessageSummaryHandler } from './commands/handlers/generate-message-summary.handler.js';
import { DigestModule } from './digest/digest.module.js';
import { EnrichmentModule } from './enrichment/enrichment.module.js';
import { MessageSummaryModule } from './message-summary/message-summary.module.js';
import { LlmSanitizationService } from './sanitization/llm-sanitization.service.js';
import { SummaryController } from './summary.controller.js';
import { SummaryService } from './summary.service.js';

@Module({
  imports: [CqrsModule, MailModule, AuthModule, ProviderModule, MessageSummaryModule, DigestModule, BriefingModule, EnrichmentModule],
  controllers: [SummaryController],
  providers: [SummaryService, LlmSanitizationService, GenerateBatchSummaryHandler, GenerateMessageSummaryHandler]
})
export class SummaryModule {}
