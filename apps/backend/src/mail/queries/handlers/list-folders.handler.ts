/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { MailFolderDto } from '@raa/assistant/common';
import { MailReadService } from '../../mail.read-service.js';
import { ListFoldersQuery } from '../list-folders.query.js';

@QueryHandler(ListFoldersQuery)
export class ListFoldersHandler implements IQueryHandler<ListFoldersQuery, MailFolderDto[]> {
  constructor(private readonly mailReadService: MailReadService) {}

  async execute(query: ListFoldersQuery): Promise<MailFolderDto[]> {
    return this.mailReadService.listFolders(query.auth);
  }
}
