/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { type ActionType, createReducer } from 'typesafe-actions'
import type { EnrichmentProgress } from './actions'
import { enrichmentActions } from './actions'

export type EnrichmentStatus = 'idle' | 'streaming' | 'ready' | 'error'

export interface EnrichmentState {
  status: EnrichmentStatus
  progress: EnrichmentProgress | null
  error: string | null
  errors: string[]
}

const initialState: EnrichmentState = {
  status: 'idle',
  progress: null,
  error: null,
  errors: [],
}

type EnrichmentAction = ActionType<typeof enrichmentActions>

export const enrichmentReducer = createReducer<EnrichmentState, EnrichmentAction>(initialState)
  .handleAction(enrichmentActions.requestEnrichment, () => ({
    status: 'streaming' as const,
    progress: null,
    error: null,
    errors: [],
  }))
  .handleAction(enrichmentActions.enrichmentProgress, (state, action) => ({
    ...state,
    progress: action.payload,
  }))
  .handleAction(enrichmentActions.enrichmentItemError, (state, action) => ({
    ...state,
    progress: { current: action.payload.current, total: action.payload.total },
    errors: [...state.errors, action.payload.message],
  }))
  .handleAction(enrichmentActions.enrichmentComplete, (state) => ({
    ...state,
    status: 'ready' as const,
    progress: null,
  }))
  .handleAction(enrichmentActions.enrichmentFailure, (state, action) => ({
    ...state,
    status: 'error' as const,
    error: action.payload.message,
  }))
