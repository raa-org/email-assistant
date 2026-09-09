/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MailModule } from '../../mail/mail.module.js';
import { ProviderModule } from '../../provider/provider.module.js';
import { GenerateDigestHandler } from './commands/handlers/generate-digest.handler.js';
import { DigestAggregatorService } from './digest-aggregator.service.js';

// Aggregation primitives + GenerateDigestCommand orchestrator. Per-message
// summaries that are not yet cached go through the existing summary command
// (which itself is cache-aware), so the LLM-call path stays in one place.
// Cached summaries are loaded in bulk via GetMessageSummariesByUidsQuery from
// MessageSummaryModule (registered globally through @QueryHandler).
@Module({
  imports: [CqrsModule, MailModule, ProviderModule],
  providers: [DigestAggregatorService, GenerateDigestHandler],
  exports: [DigestAggregatorService]
})
export class DigestModule {}
