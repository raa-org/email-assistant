/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvalidateMessageSummaryHandler } from './commands/handlers/invalidate-message-summary.handler.js';
import { StoreMessageSummaryHandler } from './commands/handlers/store-message-summary.handler.js';
import { MessageSummaryEntity } from './message-summary.entity.js';
import { GetMessageSummariesByUidsHandler } from './queries/handlers/get-message-summaries-by-uids.handler.js';
import { GetMessageSummaryHandler } from './queries/handlers/get-message-summary.handler.js';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([MessageSummaryEntity])],
  providers: [
    GetMessageSummaryHandler,
    GetMessageSummariesByUidsHandler,
    StoreMessageSummaryHandler,
    InvalidateMessageSummaryHandler
  ]
})
export class MessageSummaryModule {}
