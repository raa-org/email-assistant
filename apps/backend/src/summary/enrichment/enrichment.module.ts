/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MailModule } from '../../mail/mail.module.js';
import { ProviderModule } from '../../provider/provider.module.js';
import { LlmSanitizationService } from '../sanitization/llm-sanitization.service.js';
import { SummaryService } from '../summary.service.js';
import { MessageBodyFetchedHandler } from './events/handlers/message-body-fetched.handler.js';

@Module({
  imports: [CqrsModule, MailModule, ProviderModule],
  providers: [SummaryService, LlmSanitizationService, MessageBodyFetchedHandler],
  exports: []
})
export class EnrichmentModule {}
