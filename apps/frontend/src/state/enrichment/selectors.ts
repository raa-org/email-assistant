/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { createSelector } from 'reselect'
import type { RootState } from '../root-state'

const selectEnrichment = (state: RootState) => state.enrichment

export const selectEnrichmentStatus = createSelector(selectEnrichment, (e) => e.status)
export const selectEnrichmentProgress = createSelector(selectEnrichment, (e) => e.progress)
export const selectEnrichmentError = createSelector(selectEnrichment, (e) => e.error)
export const selectEnrichmentStreaming = createSelector(
  selectEnrichmentStatus,
  (status) => status === 'streaming'
)
export const selectEnrichmentReady = createSelector(
  selectEnrichmentStatus,
  (status) => status === 'ready'
)
export const selectEnrichmentErrors = createSelector(selectEnrichment, (e) => e.errors)
