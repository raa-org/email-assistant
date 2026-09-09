/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { DigestBlockDto, DigestBlockId, SentReceivedDayDto } from '@raa/assistant/common'

export interface DerivedMetric {
  count: number
  label: string
  color: 'blue' | 'orange' | 'green' | 'amber'
}

export type DerivedSummaryTone = 'info' | 'warning' | 'success' | 'danger' | 'accent'

export interface DerivedSummaryItem {
  id: string
  tone: DerivedSummaryTone
  text: string
  link?: string
  href?: string
}

export type Blocks = Partial<Record<DigestBlockId, DigestBlockDto>>

// totalProcessed is the definitive count of emails in the current digest run
// (all unread that were fetched from IMAP). Using it for "Emails Received"
// ensures the metric is always consistent with how many messages the user
// actually has, regardless of which categories the LLM assigned.
export function deriveMetrics(blocks: Blocks, totalProcessed: number): DerivedMetric[] {
  return [
    { count: totalProcessed, label: 'Emails Received', color: 'blue' },
    { count: blocks.importantEmails?.count ?? 0, label: 'Important Emails', color: 'orange' },
    { count: blocks.newEmails?.count ?? 0, label: 'New Emails', color: 'green' },
    { count: blocks.junkMessages?.count ?? 0, label: 'Marked as Junk', color: 'amber' },
  ]
}

interface BlockRule {
  blockId: DigestBlockId
  /** Additional blocks whose samples contribute to the link */
  extraBlocks?: DigestBlockId[]
  tone: DerivedSummaryTone
  /** Text template: {n} = count. For pluralization use {s} (empty when 1, "s" otherwise). */
  text: string
  link: string
  href?: string
  /** Show even when count is 0 — uses zeroItem instead */
  zeroItem?: { tone: DerivedSummaryTone; text: string }
}

const BLOCK_RULES: BlockRule[] = [
  {
    blockId: 'emailsReceived',
    tone: 'info',
    text: '{n} email{s} received in the selected window.',
    link: 'View all emails →',
    href: '/inbox?showNew=true',
  },
  {
    blockId: 'requiresAttention',
    extraBlocks: ['importantEmails'],
    tone: 'warning',
    text: '{n} email{s} require{_s} your attention – feedback, approvals, or follow-ups.',
    link: 'View important emails →',
  },
  {
    blockId: 'critical',
    tone: 'danger',
    text: '{n} critical issue{s} reported – review without delay.',
    link: 'View critical →',
    zeroItem: { tone: 'success', text: 'No critical issues reported in the selected window.' },
  },
  {
    blockId: 'invoices',
    tone: 'success',
    text: '{n} invoice{s} detected.',
    link: 'Check invoices →',
  },
  {
    blockId: 'importantEmails',
    tone: 'warning',
    text: '{n} important email{s} flagged.',
    link: 'View important →',
  },
  {
    blockId: 'suspicious',
    tone: 'danger',
    text: '{n} suspicious email{s} detected – verify before acting.',
    link: 'View suspicious →',
  },
  {
    blockId: 'meetings',
    tone: 'accent',
    text: '{n} meeting invite{s} in the selected window.',
    link: 'View meetings →',
  },
  {
    blockId: 'newEmails',
    tone: 'info',
    text: '{n} recently arrived email{s}.',
    link: 'View new →',
  },
  {
    blockId: 'severalEmails',
    tone: 'info',
    text: '{n} email{s} from frequent senders.',
    link: 'View frequent →',
  },
  {
    blockId: 'junkMessages',
    tone: 'warning',
    text: '{n} message{s} marked as junk.',
    link: 'View junk →',
  },
]

function formatRuleText(template: string, count: number): string {
  return template
    .replace(/\{n\}/g, String(count))
    .replace(/\{s\}/g, count === 1 ? '' : 's')
    .replace(/\{_s\}/g, count === 1 ? 's' : '')
}

// Builds a structured-narrative list out of digest blocks for the upper-left
// "Email Overview" card. Each item is derived declaratively from BLOCK_RULES.
export function deriveSummaryItems(blocks: Blocks): DerivedSummaryItem[] {
  const items: DerivedSummaryItem[] = []

  for (const rule of BLOCK_RULES) {
    const count = blocks[rule.blockId]?.count ?? 0

    if (count > 0) {
      const extraSources = (rule.extraBlocks ?? []).map((id) => blocks[id])
      items.push({
        id: rule.blockId,
        tone: rule.tone,
        text: formatRuleText(rule.text, count),
        link: rule.link,
        href: rule.href ?? buildUidsHref(blocks[rule.blockId], ...extraSources),
      })
    } else if (rule.zeroItem) {
      items.push({
        id: `${rule.blockId}-none`,
        tone: rule.zeroItem.tone,
        text: rule.zeroItem.text,
      })
    }
  }

  return items
}

function buildUidsHref(...blockSources: Array<DigestBlockDto | undefined>): string {
  const uids = blockSources.flatMap((b) => b?.samples ?? []).map((s) => s.uid)

  const unique = [...new Set(uids)]

  return unique.length > 0 ? `/inbox?uids=${unique.join(',')}` : '/inbox'
}

// Names the busiest day from the 7-day chart; used as the chart card title.
export function busiestDayLabel(series: SentReceivedDayDto[]): string {
  if (series.length === 0) {
    return 'Email Activity'
  }

  let busiest = series[0]

  for (const day of series) {
    if (day.received + day.sent > busiest.received + busiest.sent) {
      busiest = day
    }
  }

  const weekday = new Date(`${busiest.day}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' })

  return `${weekday} Was Your Busiest Day for Emails`
}
