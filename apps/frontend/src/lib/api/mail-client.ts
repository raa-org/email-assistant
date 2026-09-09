/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client';

import type { MailFolderDto, MailMessageDetailDto, MailMessageDto, SummaryResultDto } from '@raa/assistant/common';
import { redirectToLogout } from './auth-fail';

const MAIL_BASE = '/api/mail';

export interface FolderStats {
  total: number;
  unread: number;
}

export async function fetchFolderStats(folder = 'INBOX'): Promise<FolderStats> {
  const response = await fetch(`${MAIL_BASE}/folders`, { credentials: 'include' });

  if (response.status === 401) {
    redirectToLogout();
    return { total: 0, unread: 0 };
  }

  if (!response.ok) {
    return { total: 0, unread: 0 };
  }

  const folders = (await response.json()) as MailFolderDto[];
  const target = folders.find((f) => f.path === folder || f.name === folder);

  return {
    total: target?.totalCount ?? 0,
    unread: target?.unreadCount ?? 0
  };
}

export interface ListMessagesParams {
  folder?: string;
  limit?: number;
  offset?: number;
  search?: string;
  since?: string;
  before?: string;
  unreadOnly?: boolean;
}

export async function fetchMessages(params: ListMessagesParams = {}): Promise<MailMessageDto[]> {
  const query = new URLSearchParams();

  if (params.folder) query.set('folder', params.folder);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));
  if (params.search) query.set('search', params.search);
  if (params.since) query.set('since', params.since);
  if (params.before) query.set('before', params.before);
  if (params.unreadOnly) query.set('unreadOnly', 'true');

  const response = await fetch(`${MAIL_BASE}/messages?${query.toString()}`, {
    credentials: 'include'
  });

  if (response.status === 401) {
    redirectToLogout();
    return [];
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.status}`);
  }

  return response.json() as Promise<MailMessageDto[]>;
}

export async function fetchMessageDetail(uid: string, folder = 'INBOX'): Promise<MailMessageDetailDto> {
  const response = await fetch(`${MAIL_BASE}/messages/${uid}?folder=${encodeURIComponent(folder)}`, {
    credentials: 'include'
  });

  if (response.status === 401) {
    redirectToLogout();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch message detail: ${response.status}`);
  }

  return response.json() as Promise<MailMessageDetailDto>;
}

export async function fetchMessageSummary(uid: string, folder = 'INBOX'): Promise<SummaryResultDto> {
  const response = await fetch('/api/summary/message', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, folder })
  });

  if (response.status === 401) {
    redirectToLogout();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch summary: ${response.status}`);
  }

  return response.json() as Promise<SummaryResultDto>;
}

export async function markMessagesRead(
  target: { uids: string[] } | { allUnread: true },
  folder = 'INBOX'
): Promise<{ markedCount: number }> {
  const body = 'uids' in target
    ? { folder, uids: target.uids }
    : { folder, allUnread: true };

  const response = await fetch(`${MAIL_BASE}/messages/mark-read`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (response.status === 401) {
    redirectToLogout();
    return { markedCount: 0 };
  }

  if (!response.ok) {
    throw new Error(`Failed to mark messages read: ${response.status}`);
  }

  return response.json() as Promise<{ markedCount: number }>;
}
