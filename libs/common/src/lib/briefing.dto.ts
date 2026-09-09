/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { SummaryPeriodDto } from './period.dto.js';

export interface PeriodSummaryResultDto {
  summary: string;
  totalMessages: number;
  sourceMessageUids: string[];
  period: SummaryPeriodDto;
  generatedAt: string;
}

export interface AgendaItemDto {
  title: string;
  description: string;
  reason: string;
  category: 'urgent' | 'action' | 'info';
  priority: 'high' | 'normal' | 'low';
  metadata: {
    sourceSubject: string;
    sourceFrom: string;
    sourceUid: string;
    sourceFolder: string;
    deadline?: string;
  };
}

export interface AgendaResultDto {
  items: AgendaItemDto[];
  totalMessages: number;
  sourceMessageUids: string[];
  period: SummaryPeriodDto;
  generatedAt: string;
}
