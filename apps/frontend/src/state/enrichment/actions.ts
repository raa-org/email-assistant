/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { SummaryPeriodKind } from '@raa/assistant/common'
import { createAction } from 'typesafe-actions'

export interface EnrichmentRequest {
  folder: string
  kind: SummaryPeriodKind
  dateFrom?: string
  dateTo?: string
  unreadOnly?: boolean
  force?: boolean
}

export interface EnrichmentProgress {
  current: number
  total: number
}

export const enrichmentActions = {
  requestEnrichment: createAction('enrichment/request')<EnrichmentRequest>(),
  enrichmentProgress: createAction('enrichment/progress')<EnrichmentProgress>(),
  enrichmentItemError: createAction('enrichment/item-error')<{ current: number; total: number; message: string }>(),
  enrichmentComplete: createAction('enrichment/complete')<{ total: number; enriched: number }>(),
  enrichmentFailure: createAction('enrichment/failure')<{ message: string }>(),
}
