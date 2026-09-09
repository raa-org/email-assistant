/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { createSelector } from 'reselect'
import type { RootState } from '../root-state'

const selectBriefing = (state: RootState) => state.briefing

export const selectSummaryState = createSelector(selectBriefing, (b) => b.summary)
export const selectSummaryStatus = createSelector(selectSummaryState, (s) => s.status)
export const selectSummaryAccumulated = createSelector(selectSummaryState, (s) => s.accumulated)
export const selectSummaryResult = createSelector(selectSummaryState, (s) => s.result)
export const selectSummaryError = createSelector(selectSummaryState, (s) => s.error)
export const selectSummaryStreaming = createSelector(
  selectSummaryStatus,
  (status) => status === 'streaming' || status === 'idle'
)
export const selectAgendaState = createSelector(selectBriefing, (b) => b.agenda)
export const selectAgendaStatus = createSelector(selectAgendaState, (s) => s.status)
export const selectAgendaItems = createSelector(selectAgendaState, (s) => s.items)
export const selectAgendaError = createSelector(selectAgendaState, (s) => s.error)
export const selectAgendaStreaming = createSelector(
  selectAgendaStatus,
  (status) => status === 'streaming' || status === 'idle'
)
