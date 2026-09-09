/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { SummaryPeriodDto } from '@raa/assistant/common';

export interface ResolvedPeriod {
  since?: Date;
  before?: Date;
  unreadOnly: boolean;
}

// Strips dateFrom/dateTo for non-custom kinds so they don't leak into responses.
export function normalizePeriod(kind: SummaryPeriodDto['kind'], dateFrom?: string, dateTo?: string): SummaryPeriodDto {
  if (kind === 'custom') {
    return { kind, dateFrom, dateTo };
  }

  return { kind };
}

export function resolvePeriod(period: SummaryPeriodDto, unreadOnlyOverride?: boolean): ResolvedPeriod {
  const base = resolvePeriodDates(period);

  // kind=unread is always unreadOnly; for other kinds the caller can force it.
  if (period.kind === 'unread') {
    return base;
  }

  return { ...base, unreadOnly: unreadOnlyOverride ?? false };
}

function resolvePeriodDates(period: SummaryPeriodDto): ResolvedPeriod {
  switch (period.kind) {
    case 'unread':
      return { unreadOnly: true };

    case 'today': {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      return { since: startOfDay, unreadOnly: false };
    }

    case 'yesterday': {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

      return { since: startOfYesterday, before: startOfToday, unreadOnly: false };
    }

    case 'week': {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      return { since, unreadOnly: false };
    }

    case 'month': {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      return { since, unreadOnly: false };
    }

    case 'custom': {
      const since = period.dateFrom ? new Date(period.dateFrom) : undefined;
      // dateTo is inclusive — "2026-04-20" means "up to end of April 20",
      // so shift to start of the next day for the exclusive BEFORE comparison.
      const before = period.dateTo ? new Date(new Date(period.dateTo).getTime() + 24 * 60 * 60 * 1000) : undefined;

      return { since, before, unreadOnly: false };
    }
  }
}
