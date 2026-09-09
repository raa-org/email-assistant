/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Injectable } from '@nestjs/common';
import type {
  AgendaItemDto,
  DigestBlockDto,
  DigestBlockId,
  DigestItemDto,
  MailMessageDto,
  SentReceivedDayDto,
  SummaryCategory,
  SummaryResultDto,
  TopContactDto
} from '@raa/assistant/common';

const SAMPLE_LIMIT = 5;
const TOP_CONTACTS_LIMIT = 5;
const STATS_DAYS = 7;

export interface ClassifiedMessage {
  envelope: MailMessageDto;
  summary: SummaryResultDto;
}

export interface BriefingInput {
  totalMessages: number;
  unreadCount: number;
  uniqueSenders: number;
  criticalItems: Array<{ subject: string; from: string; summary: string; agendaItem?: string | null }>;
  notableItems: Array<{ subject: string; from: string; summary: string; agendaItem?: string | null }>;
  categoryCounts: Partial<Record<SummaryCategory, number>>;
  lowPriorityCount: number;
  junkCount: number;
}

const CATEGORY_TO_BLOCK: Partial<Record<SummaryCategory, DigestBlockId>> = {
  critical: 'critical',
  suspicious: 'suspicious',
  invoice: 'invoices',
  meeting: 'meetings',
  junk: 'junkMessages',
  new: 'newEmails',
  important: 'importantEmails',
  received: 'emailsReceived',
  requires_attention: 'requiresAttention'
};

const ALL_BLOCK_IDS: readonly DigestBlockId[] = [
  'critical',
  'suspicious',
  'severalEmails',
  'invoices',
  'meetings',
  'junkMessages',
  'newEmails',
  'importantEmails',
  'emailsReceived',
  'requiresAttention'
];

// Pure aggregation — no IO, no LLM. Takes already-summarized messages and
// produces the snapshot rendered on /digest. Stays deterministic so the same
// input always yields the same blocks (helpful for caching higher up).
@Injectable()
export class DigestAggregatorService {
  buildBlocks(messages: ClassifiedMessage[]): Record<DigestBlockId, DigestBlockDto> {
    const buckets = createEmptyBuckets();

    for (const message of messages) {
      const item = toDigestItem(message);

      // Every classified message is by definition "received" — this is an
      // axiom, not a LLM judgment. Force it so emailsReceived.count always
      // equals the total number of classified messages regardless of what
      // categories the model returned.
      buckets.emailsReceived.push(item);

      for (const category of message.summary.categories) {
        const blockId = CATEGORY_TO_BLOCK[category];

        if (blockId && blockId !== 'emailsReceived') {
          buckets[blockId].push(item);
        }
      }
    }

    // 'severalEmails' = sender appearing 2+ times in the input window. Pulled
    // from envelopes rather than categories — LLM can't tell on a per-email
    // pass.
    const senderCounts = countBySender(messages);
    const severalEmailsItems = messages
      .filter(({ envelope }) => (senderCounts.get(envelope.from) ?? 0) >= 2)
      .map(toDigestItem);

    buckets.severalEmails.push(...severalEmailsItems);

    return finalizeBuckets(buckets);
  }

  topContacts(envelopes: MailMessageDto[]): TopContactDto[] {
    const counts = new Map<string, { name: string; email: string; count: number }>();

    for (const envelope of envelopes) {
      const parsed = parseFromAddress(envelope.from);

      if (!parsed.email) {
        continue;
      }

      const existing = counts.get(parsed.email);

      if (existing) {
        existing.count += 1;
      } else {
        counts.set(parsed.email, { name: parsed.name ?? parsed.email, email: parsed.email, count: 1 });
      }
    }

    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_CONTACTS_LIMIT);
  }

  // Select top-N messages by priorityScore, excluding junk.
  selectTopMessages(messages: ClassifiedMessage[], limit: number): ClassifiedMessage[] {
    return [...messages]
      .filter((m) => !m.summary.isJunk)
      .sort((a, b) => getPriorityScore(b.summary) - getPriorityScore(a.summary))
      .slice(0, limit);
  }

  // Build agenda items deterministically from L1 enrichment data (no LLM).
  buildAgendaFromL1(messages: ClassifiedMessage[]): AgendaItemDto[] {
    const items = messages
      .filter((m) => m.summary.actionRequired === true || (m.summary.agendaItem != null && m.summary.agendaItem.length > 0))
      .sort((a, b) => getPriorityScore(b.summary) - getPriorityScore(a.summary))
      .map(({ envelope, summary }) => ({
        title: summary.agendaItem ?? summary.title,
        description: summary.summary,
        reason: summary.actionItems[0] ?? '',
        category: mapToAgendaCategory(summary),
        priority: mapToAgendaPriority(summary),
        metadata: {
          sourceSubject: envelope.subject,
          sourceFrom: envelope.from,
          sourceUid: envelope.uid,
          sourceFolder: envelope.folder,
          ...(summary.deadline ? { deadline: summary.deadline } : {})
        }
      }));

    // Deduplicate by title (case-insensitive), keep the higher-priority one (first in sorted order)
    const seen = new Set<string>();

    return items.filter((item) => {
      const key = item.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Build the compact input for the L3 briefing narrative prompt.
  buildBriefingInput(messages: ClassifiedMessage[], envelopes: MailMessageDto[]): BriefingInput {
    const uniqueSenders = new Set(envelopes.map((e) => e.from)).size;
    const unreadCount = envelopes.filter((e) => e.isUnread).length;

    const critical: ClassifiedMessage[] = [];
    const notable: ClassifiedMessage[] = [];
    let lowPriorityCount = 0;
    let junkCount = 0;
    const categoryCounts: Partial<Record<SummaryCategory, number>> = {};

    for (const msg of messages) {
      const score = getPriorityScore(msg.summary);

      // Count categories
      for (const cat of msg.summary.categories) {
        categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
      }

      if (msg.summary.isJunk) {
        junkCount++;
        continue;
      }

      if (score >= 80 || msg.summary.urgency === 'critical' || msg.summary.categories.includes('critical')) {
        critical.push(msg);
      } else if (score >= 40 || msg.summary.actionRequired) {
        notable.push(msg);
      } else {
        lowPriorityCount++;
      }
    }

    // Sort and take top 5
    critical.sort((a, b) => getPriorityScore(b.summary) - getPriorityScore(a.summary));
    notable.sort((a, b) => getPriorityScore(b.summary) - getPriorityScore(a.summary));

    const toBriefingItem = (m: ClassifiedMessage) => ({
      subject: m.envelope.subject,
      from: m.envelope.from,
      summary: m.summary.summary,
      agendaItem: m.summary.agendaItem,
    });

    return {
      totalMessages: envelopes.length,
      unreadCount,
      uniqueSenders,
      criticalItems: critical.slice(0, 5).map(toBriefingItem),
      notableItems: notable.slice(0, 5).map(toBriefingItem),
      categoryCounts,
      lowPriorityCount,
      junkCount,
    };
  }

  // Builds a 7-day series of sent/received counts. Sent is currently always
  // zero because Phase 1 only reads INBOX; once SENT folder support arrives
  // (later phase) callers will pre-fetch sent envelopes and pass them too.
  sentReceivedSeries(receivedEnvelopes: MailMessageDto[], sentEnvelopes: MailMessageDto[] = [], now = new Date()): SentReceivedDayDto[] {
    const series: SentReceivedDayDto[] = [];
    const startOfToday = startOfDay(now);

    for (let i = STATS_DAYS - 1; i >= 0; i -= 1) {
      const dayStart = new Date(startOfToday);
      dayStart.setDate(startOfToday.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      series.push({
        day: dayStart.toISOString().slice(0, 10),
        received: countInWindow(receivedEnvelopes, dayStart, dayEnd),
        sent: countInWindow(sentEnvelopes, dayStart, dayEnd)
      });
    }

    return series;
  }
}

function createEmptyBuckets(): Record<DigestBlockId, DigestItemDto[]> {
  const buckets = {} as Record<DigestBlockId, DigestItemDto[]>;

  for (const id of ALL_BLOCK_IDS) {
    buckets[id] = [];
  }

  return buckets;
}

function finalizeBuckets(buckets: Record<DigestBlockId, DigestItemDto[]>): Record<DigestBlockId, DigestBlockDto> {
  const result = {} as Record<DigestBlockId, DigestBlockDto>;

  for (const id of ALL_BLOCK_IDS) {
    const items = dedupeByUid(buckets[id]);

    items.sort(byPriorityThenRecency);
    result[id] = {
      count: items.length,
      samples: items.slice(0, SAMPLE_LIMIT)
    };
  }

  return result;
}

function dedupeByUid(items: DigestItemDto[]): DigestItemDto[] {
  const seen = new Set<string>();
  const out: DigestItemDto[] = [];

  for (const item of items) {
    const key = `${item.folder}:${item.uid}`;

    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }

  return out;
}

function byPriorityThenRecency(a: DigestItemDto, b: DigestItemDto): number {
  const priorityRank: Record<string, number> = { high: 0, normal: 1, low: 2 };
  const diff = priorityRank[a.priority] - priorityRank[b.priority];

  if (diff !== 0) {
    return diff;
  }

  return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
}

function toDigestItem({ envelope, summary }: ClassifiedMessage): DigestItemDto {
  return {
    uid: envelope.uid,
    folder: envelope.folder,
    subject: envelope.subject,
    from: envelope.from,
    receivedAt: envelope.receivedAt,
    summary: summary.summary,
    priority: summary.priority,
    categories: summary.categories
  };
}

function countBySender(messages: ClassifiedMessage[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const { envelope } of messages) {
    counts.set(envelope.from, (counts.get(envelope.from) ?? 0) + 1);
  }

  return counts;
}

function parseFromAddress(value: string): { name?: string; email?: string } {
  const match = value.match(/^(.*?)\s*<([^>]+)>\s*$/);

  if (match) {
    const name = match[1]?.trim();

    return {
      name: name && name.length > 0 ? name.replace(/^"|"$/g, '') : undefined,
      email: match[2]?.trim().toLowerCase()
    };
  }

  const trimmed = value.trim();

  if (trimmed.includes('@')) {
    return { email: trimmed.toLowerCase() };
  }

  return {};
}

function startOfDay(date: Date): Date {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);

  return out;
}

function countInWindow(envelopes: MailMessageDto[], start: Date, end: Date): number {
  return envelopes.reduce((acc, envelope) => {
    const ts = new Date(envelope.receivedAt).getTime();

    return ts >= start.getTime() && ts < end.getTime() ? acc + 1 : acc;
  }, 0);
}

// L1 enrichment field helpers — safe fallbacks for old cached payloads
// that lack the new fields.

const PRIORITY_TO_SCORE: Record<string, number> = { high: 80, normal: 50, low: 20 };

function getPriorityScore(summary: SummaryResultDto): number {
  return summary.priorityScore ?? (PRIORITY_TO_SCORE[summary.priority] ?? 50);
}

function mapToAgendaCategory(summary: SummaryResultDto): AgendaItemDto['category'] {
  if (summary.urgency === 'critical' || summary.categories.includes('critical')) {
    return 'urgent';
  }

  if (summary.actionRequired) {
    return 'action';
  }

  return 'info';
}

function mapToAgendaPriority(summary: SummaryResultDto): AgendaItemDto['priority'] {
  const score = getPriorityScore(summary);

  if (score >= 80) return 'high';
  if (score >= 40) return 'normal';
  return 'low';
}
