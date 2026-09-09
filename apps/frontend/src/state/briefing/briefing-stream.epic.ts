/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client'

import type { AgendaItemDto, PeriodSummaryResultDto } from '@raa/assistant/common'
import type { Epic } from 'redux-observable'
import { catchError, EMPTY, filter, map, merge, of, switchMap, takeUntil } from 'rxjs'
import { isActionOf } from 'typesafe-actions'
import { createSseObservable, type SseError } from '../../lib/api/sse'
import type { RootAction } from '../root-action'
import type { RootState } from '../root-state'
import { briefingActions, type BriefingRequest } from './actions'

const SUMMARY_STREAM_PATH = '/api/summary/briefing/period-summary/stream'
const AGENDA_STREAM_PATH = '/api/summary/briefing/agenda/stream'

const SSE_EVENT_TYPES = ['chunk', 'result', 'done', 'error'] as const

interface ChunkPayload {
  content: string
  accumulated: string
}

interface ErrorPayload {
  message: string
}

export const briefingSummaryEpic: Epic<RootAction, RootAction, RootState> = (action$) =>
  action$.pipe(
    filter(isActionOf(briefingActions.requestSummary)),
    switchMap((action) => {
      const url = buildStreamUrl(SUMMARY_STREAM_PATH, action.payload)
      const stop$ = action$.pipe(
        filter(
          (next) =>
            isActionOf(briefingActions.summaryComplete)(next) ||
            isActionOf(briefingActions.summaryFailure)(next) ||
            isActionOf(briefingActions.requestSummary)(next),
        ),
      )

      return createSseObservable(url, SSE_EVENT_TYPES).pipe(
        map((message): RootAction | null => {
          switch (message.type) {
            case 'chunk': {
              const payload = message.data as ChunkPayload
              return briefingActions.summaryChunk({ content: payload.content, accumulated: payload.accumulated })
            }
            case 'result': {
              const payload = message.data as PeriodSummaryResultDto
              return briefingActions.summaryResult(payload)
            }
            case 'done':
              return briefingActions.summaryComplete()
            case 'error': {
              const payload = message.data as ErrorPayload
              return briefingActions.summaryFailure({ message: payload.message ?? 'Summary stream failed' })
            }
            default:
              return null
          }
        }),
        filter((emitted): emitted is RootAction => emitted !== null),
        catchError((error: SseError) => {
          if (error.reason === 'unauthorized') return EMPTY
          return of(briefingActions.summaryFailure({ message: error.message }))
        }),
        takeUntil(stop$),
      )
    }),
  )

export const briefingAgendaEpic: Epic<RootAction, RootAction, RootState> = (action$) =>
  action$.pipe(
    filter(isActionOf(briefingActions.requestAgenda)),
    switchMap((action) => {
      const url = buildStreamUrl(AGENDA_STREAM_PATH, action.payload)
      const stop$ = action$.pipe(
        filter(
          (next) =>
            isActionOf(briefingActions.agendaComplete)(next) ||
            isActionOf(briefingActions.agendaFailure)(next) ||
            isActionOf(briefingActions.requestAgenda)(next),
        ),
      )

      return createSseObservable(url, SSE_EVENT_TYPES).pipe(
        map((message): RootAction | null => {
          switch (message.type) {
            case 'chunk': {
              const payload = message.data as ChunkPayload
              return briefingActions.agendaChunk({ content: payload.content, accumulated: payload.accumulated })
            }
            case 'result': {
              const payload = message.data as { items: AgendaItemDto[] }
              return briefingActions.agendaResult({ items: payload.items })
            }
            case 'done':
              return briefingActions.agendaComplete()
            case 'error': {
              const payload = message.data as ErrorPayload
              return briefingActions.agendaFailure({ message: payload.message ?? 'Agenda stream failed' })
            }
            default:
              return null
          }
        }),
        filter((emitted): emitted is RootAction => emitted !== null),
        catchError((error: SseError) => {
          if (error.reason === 'unauthorized') return EMPTY
          return of(briefingActions.agendaFailure({ message: error.message }))
        }),
        takeUntil(stop$),
      )
    }),
  )

export const briefingEpic: Epic<RootAction, RootAction, RootState> = (action$, state$, deps) =>
  merge(briefingSummaryEpic(action$, state$, deps), briefingAgendaEpic(action$, state$, deps))

function buildStreamUrl(basePath: string, request: BriefingRequest): string {
  const params = new URLSearchParams()
  params.set('kind', request.kind)
  params.set('folder', request.folder)
  if (request.unreadOnly) params.set('unreadOnly', 'true')
  if (request.force) params.set('force', 'true')
  if (request.dateFrom) params.set('dateFrom', request.dateFrom)
  if (request.dateTo) params.set('dateTo', request.dateTo)

  return `${basePath}?${params.toString()}`
}
