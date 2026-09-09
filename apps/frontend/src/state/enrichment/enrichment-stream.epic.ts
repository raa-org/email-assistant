/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client'

import type { Epic } from 'redux-observable'
import { catchError, EMPTY, filter, map, of, switchMap, takeUntil } from 'rxjs'
import { isActionOf } from 'typesafe-actions'
import { createSseObservable, type SseError } from '../../lib/api/sse'
import type { RootAction } from '../root-action'
import type { RootState } from '../root-state'
import { enrichmentActions, type EnrichmentProgress, type EnrichmentRequest } from './actions'

const ENRICH_STREAM_PATH = '/api/summary/enrich/stream'

const SSE_EVENT_TYPES = ['enrichment', 'enrichment-error', 'done', 'error'] as const

interface ErrorPayload {
  message: string
}

interface DonePayload {
  total: number
  enriched: number
}

export const enrichmentEpic: Epic<RootAction, RootAction, RootState> = (action$) =>
  action$.pipe(
    filter(isActionOf(enrichmentActions.requestEnrichment)),
    switchMap((action) => {
      const url = buildStreamUrl(ENRICH_STREAM_PATH, action.payload)
      const stop$ = action$.pipe(
        filter(
          (next) =>
            isActionOf(enrichmentActions.enrichmentComplete)(next) ||
            isActionOf(enrichmentActions.enrichmentFailure)(next) ||
            isActionOf(enrichmentActions.requestEnrichment)(next),
        ),
      )

      return createSseObservable(url, SSE_EVENT_TYPES).pipe(
        map((message): RootAction | null => {
          switch (message.type) {
            case 'enrichment': {
              const payload = message.data as EnrichmentProgress
              return enrichmentActions.enrichmentProgress(payload)
            }
            case 'enrichment-error': {
              const payload = message.data as { current: number; total: number; message: string }
              return enrichmentActions.enrichmentItemError(payload)
            }
            case 'done': {
              const payload = message.data as DonePayload
              return enrichmentActions.enrichmentComplete({ total: payload.total, enriched: payload.enriched })
            }
            case 'error': {
              const payload = message.data as ErrorPayload
              return enrichmentActions.enrichmentFailure({ message: payload.message ?? 'Enrichment failed' })
            }
            default:
              return null
          }
        }),
        filter((emitted): emitted is RootAction => emitted !== null),
        catchError((error: SseError) => {
          if (error.reason === 'unauthorized') return EMPTY
          return of(enrichmentActions.enrichmentFailure({ message: error.message }))
        }),
        takeUntil(stop$),
      )
    }),
  )

function buildStreamUrl(basePath: string, request: EnrichmentRequest): string {
  const params = new URLSearchParams()
  params.set('kind', request.kind)
  params.set('folder', request.folder)
  if (request.unreadOnly) params.set('unreadOnly', 'true')
  if (request.force) params.set('force', 'true')
  if (request.dateFrom) params.set('dateFrom', request.dateFrom)
  if (request.dateTo) params.set('dateTo', request.dateTo)

  return `${basePath}?${params.toString()}`
}
