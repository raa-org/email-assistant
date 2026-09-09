/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { SummaryCategory, SummaryPriority } from './summary.dto.js';

// IDs for the visual blocks rendered on the /digest dashboard. Mapping from
// SummaryCategory → DigestBlockId is one-to-one with two extras:
//   - 'severalEmails' is a derived bucket (a thread / conversation hint),
//   - 'requires_attention' from the per-email dto becomes 'requiresAttention'.
export type DigestBlockId =
  | 'critical'
  | 'suspicious'
  | 'severalEmails'
  | 'invoices'
  | 'meetings'
  | 'junkMessages'
  | 'newEmails'
  | 'importantEmails'
  | 'emailsReceived'
  | 'requiresAttention';

export interface DigestItemDto {
  uid: string;
  folder: string;
  subject: string;
  from: string;
  receivedAt: string;
  summary: string;
  priority: SummaryPriority;
  categories: SummaryCategory[];
}

export interface DigestBlockDto {
  count: number;
  samples: DigestItemDto[];
}

export interface TopContactDto {
  name: string;
  email: string;
  count: number;
}

export interface SentReceivedDayDto {
  day: string; // ISO date (YYYY-MM-DD)
  sent: number;
  received: number;
}

export interface DigestPayloadDto {
  blocks: Record<DigestBlockId, DigestBlockDto>;
  topContacts: TopContactDto[];
  sentReceived: SentReceivedDayDto[];
  generatedAt: string;
  totalProcessed: number;
}

// Digest content is always "all unread" — no client-controlled time bound,
// so a returning-from-vacation user sees every still-unread message regardless
// of age. Stats blocks (top contacts, sent/received chart) use a fixed window
// configured server-side via DIGEST_STATS_WINDOW_DAYS.
export interface DigestRequestDto {
  folder: string;
}
