/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

export type SummaryPeriodKind = 'unread' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface SummaryPeriodDto {
  kind: SummaryPeriodKind;
  dateFrom?: string; // ISO date, required when kind='custom'
  dateTo?: string; // ISO date, required when kind='custom'
}
