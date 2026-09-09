/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { MailMessageDetailDto } from '@raa/assistant/common';
import { MailReadService } from '../../mail.read-service.js';
import { GetMessageQuery } from '../get-message.query.js';

@QueryHandler(GetMessageQuery)
export class GetMessageHandler implements IQueryHandler<GetMessageQuery, MailMessageDetailDto> {
  constructor(private readonly mailReadService: MailReadService) {}

  async execute(query: GetMessageQuery): Promise<MailMessageDetailDto> {
    return this.mailReadService.getMessage(query.auth, query.folder, query.uid);
  }
}
