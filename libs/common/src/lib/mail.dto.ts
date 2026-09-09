/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { AttachmentMetadataDto } from './attachment.dto.js';

export interface MailFolderDto {
  name: string;
  path: string;
  totalCount: number;
  unreadCount: number;
}

export interface MailMessageDto {
  uid: string;
  folder: string;
  subject: string;
  from: string;
  receivedAt: string;
  preview: string;
  isUnread: boolean;
}

export interface MailMessageDetailDto extends MailMessageDto {
  bodyText: string;
  bodyHtml?: string;
  attachments?: AttachmentMetadataDto[];
}
