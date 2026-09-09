/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { MailMessageDto } from '@raa/assistant/common';

export function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^(.*?)\s*<([^>]+)>\s*$/);

  if (match) {
    const name = match[1]?.trim().replace(/^"|"$/g, '');

    return {
      name: name && name.length > 0 ? name : match[2]?.trim() ?? from,
      email: match[2]?.trim() ?? ''
    };
  }

  if (from.includes('@')) {
    return { name: from.trim(), email: from.trim() };
  }

  return { name: from || 'Unknown', email: '' };
}

export function formatTimeLabel(receivedAt: string): string {
  const date = new Date(receivedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour}h ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Group messages by date bucket for visual separation in the list.
export function groupMessages(messages: MailMessageDto[]): {
  today: MailMessageDto[];
  yesterday: MailMessageDto[];
  older: MailMessageDto[];
} {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const today: MailMessageDto[] = [];
  const yesterday: MailMessageDto[] = [];
  const older: MailMessageDto[] = [];

  for (const msg of messages) {
    const ts = new Date(msg.receivedAt).getTime();

    if (ts >= startOfToday.getTime()) {
      today.push(msg);
    } else if (ts >= startOfYesterday.getTime()) {
      yesterday.push(msg);
    } else {
      older.push(msg);
    }
  }

  return { today, yesterday, older };
}
