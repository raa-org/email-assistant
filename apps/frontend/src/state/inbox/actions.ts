/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { MailMessageDetailDto, MailMessageDto, SummaryResultDto } from '@raa/assistant/common';
import { createAction } from 'typesafe-actions';

export type InboxTab = 'all' | 'today' | 'yesterday' | '3days' | '7days' | 'custom';

export interface InboxFetchParams {
  folder: string;
  tab: InboxTab;
  search?: string;
  unreadOnly?: boolean;
  since?: string;
  before?: string;
}

export interface FolderStatsPayload {
  total: number;
  unread: number;
}

export const inboxActions = {
  setActiveTab: createAction('inbox/set-active-tab')<InboxTab>(),
  setShowNewOnly: createAction('inbox/set-show-new-only')<boolean>(),
  setSearchQuery: createAction('inbox/set-search-query')<string>(),

  requestMessages: createAction('inbox/request-messages')<InboxFetchParams>(),
  messagesLoaded: createAction('inbox/messages-loaded')<MailMessageDto[]>(),
  messagesFailed: createAction('inbox/messages-failed')<{ message: string }>(),

  // Folder-level counts from IMAP STATUS (fast, no message enumeration)
  folderStatsLoaded: createAction('inbox/folder-stats-loaded')<FolderStatsPayload>(),

  // Message detail panel
  selectMessage: createAction('inbox/select-message')<{ uid: string; folder: string }>(),
  closeMessage: createAction('inbox/close-message')(),
  messageDetailLoaded: createAction('inbox/message-detail-loaded')<MailMessageDetailDto>(),
  messageDetailFailed: createAction('inbox/message-detail-failed')<{ message: string }>(),

  // Per-message summary (SSE streaming)
  summaryLoaded: createAction('inbox/summary-loaded')<SummaryResultDto>(),
  summaryLoading: createAction('inbox/summary-loading')(),
  summaryChunk: createAction('inbox/summary-chunk')<{ content: string; accumulated: string }>(),
  summaryFailed: createAction('inbox/summary-failed')<{ message: string }>(),
  requestResummarize: createAction('inbox/request-resummarize')<{ uid: string; folder: string }>(),

  // Mark-read actions (wired to POST /api/mail/messages/mark-read)
  markRead: createAction('inbox/mark-read')<{ folder: string; uid: string }>(),
  markAllRead: createAction('inbox/mark-all-read')<{ folder: string }>(),
  markReadSuccess: createAction('inbox/mark-read-success')<{ uids: string[] }>(),
  markReadFailure: createAction('inbox/mark-read-failure')<{ message: string }>()
};
