/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { AgendaItemDto, PeriodSummaryResultDto } from '@raa/assistant/common'
import { type ActionType, createReducer } from 'typesafe-actions'
import { briefingActions } from './actions'

export type BriefingStatus = 'idle' | 'streaming' | 'ready' | 'error'

export interface BriefingState {
  summary: {
    status: BriefingStatus
    accumulated: string
    result: PeriodSummaryResultDto | null
    error: string | null
  }
  agenda: {
    status: BriefingStatus
    accumulated: string
    items: AgendaItemDto[]
    error: string | null
  }
}

const initialState: BriefingState = {
  summary: { status: 'idle', accumulated: '', result: null, error: null },
  agenda: { status: 'idle', accumulated: '', items: [], error: null },
}

type BriefingAction = ActionType<typeof briefingActions>

export const briefingReducer = createReducer<BriefingState, BriefingAction>(initialState)
  .handleAction(briefingActions.reset, () => initialState)
  // Summary
  .handleAction(briefingActions.requestSummary, (state) => ({
    ...state,
    summary: { status: 'streaming', accumulated: '', result: null, error: null },
  }))
  .handleAction(briefingActions.summaryChunk, (state, action) => ({
    ...state,
    summary: { ...state.summary, accumulated: action.payload.accumulated },
  }))
  .handleAction(briefingActions.summaryResult, (state, action) => ({
    ...state,
    summary: { ...state.summary, result: action.payload },
  }))
  .handleAction(briefingActions.summaryComplete, (state) => ({
    ...state,
    summary: { ...state.summary, status: 'ready' },
  }))
  .handleAction(briefingActions.summaryFailure, (state, action) => ({
    ...state,
    summary: { ...state.summary, status: 'error', error: action.payload.message },
  }))
  // Agenda
  .handleAction(briefingActions.requestAgenda, (state) => ({
    ...state,
    agenda: { status: 'streaming', accumulated: '', items: [], error: null },
  }))
  .handleAction(briefingActions.agendaChunk, (state, action) => ({
    ...state,
    agenda: { ...state.agenda, accumulated: action.payload.accumulated },
  }))
  .handleAction(briefingActions.agendaResult, (state, action) => ({
    ...state,
    agenda: { ...state.agenda, items: action.payload.items },
  }))
  .handleAction(briefingActions.agendaComplete, (state) => ({
    ...state,
    agenda: { ...state.agenda, status: 'ready' },
  }))
  .handleAction(briefingActions.agendaFailure, (state, action) => ({
    ...state,
    agenda: { ...state.agenda, status: 'error', error: action.payload.message },
  }))
