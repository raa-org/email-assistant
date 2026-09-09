/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { MailMessageDto } from '@raa/assistant/common';
import { MailReadService } from '../../mail.read-service.js';
import { ListMessagesQuery } from '../list-messages.query.js';

@QueryHandler(ListMessagesQuery)
export class ListMessagesHandler implements IQueryHandler<ListMessagesQuery, MailMessageDto[]> {
  constructor(private readonly mailReadService: MailReadService) {}

  async execute(query: ListMessagesQuery): Promise<MailMessageDto[]> {
    return this.mailReadService.listMessages(query.auth, query.folder, {
      limit: query.limit,
      offset: query.offset,
      search: query.search,
      since: query.since,
      before: query.before,
      unreadOnly: query.unreadOnly
    });
  }
}
