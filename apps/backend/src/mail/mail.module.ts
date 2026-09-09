/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module.js';
import { MarkMessagesReadHandler } from './commands/handlers/mark-messages-read.handler.js';
import { MailController } from './mail.controller.js';
import { MailReadService } from './mail.read-service.js';
import { MailWriteService } from './mail.write-service.js';
import { GetMessageHandler } from './queries/handlers/get-message.handler.js';
import { ListFoldersHandler } from './queries/handlers/list-folders.handler.js';
import { ListMessagesHandler } from './queries/handlers/list-messages.handler.js';

const queryHandlers = [GetMessageHandler, ListFoldersHandler, ListMessagesHandler];
const commandHandlers = [MarkMessagesReadHandler];

@Module({
  imports: [CqrsModule, AuthModule],
  controllers: [MailController],
  providers: [MailReadService, MailWriteService, ...queryHandlers, ...commandHandlers],
  exports: [MailReadService]
})
export class MailModule {}
