/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { AgendaItemDto, PeriodSummaryResultDto, SummaryPeriodKind } from '@raa/assistant/common'
import { createAction } from 'typesafe-actions'

export interface BriefingRequest {
  folder: string
  kind: SummaryPeriodKind
  dateFrom?: string
  dateTo?: string
  unreadOnly?: boolean
  force?: boolean
}

export const briefingActions = {
  // Reset all briefing state (used when enrichment starts, before briefing/agenda)
  reset: createAction('briefing/reset')(),

  // Period summary
  requestSummary: createAction('briefing/summary/request')<BriefingRequest>(),
  summaryChunk: createAction('briefing/summary/chunk')<{ content: string; accumulated: string }>(),
  summaryResult: createAction('briefing/summary/result')<PeriodSummaryResultDto>(),
  summaryComplete: createAction('briefing/summary/complete')(),
  summaryFailure: createAction('briefing/summary/failure')<{ message: string }>(),

  // Agenda
  requestAgenda: createAction('briefing/agenda/request')<BriefingRequest>(),
  agendaChunk: createAction('briefing/agenda/chunk')<{ content: string; accumulated: string }>(),
  agendaResult: createAction('briefing/agenda/result')<{ items: AgendaItemDto[] }>(),
  agendaComplete: createAction('briefing/agenda/complete')(),
  agendaFailure: createAction('briefing/agenda/failure')<{ message: string }>(),
}
