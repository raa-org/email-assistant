/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client';

import type {
  DigestBlockDto,
  DigestBlockId,
  SentReceivedDayDto,
  TopContactDto
} from '@raa/assistant/common';
import type { Epic } from 'redux-observable';
import { catchError, EMPTY, filter, map, of, switchMap, takeUntil } from 'rxjs';
import { isActionOf } from 'typesafe-actions';
import { createSseObservable, type SseError } from '../../lib/api/sse';
import type { RootAction } from '../root-action';
import type { RootState } from '../root-state';
import { digestActions, type DigestStreamRequest } from './actions';

const STREAM_PATH = '/api/summary/digest/stream';

const BLOCK_EVENT_PREFIX = 'block:';
const ALL_BLOCK_IDS: readonly DigestBlockId[] = [
  'critical',
  'suspicious',
  'severalEmails',
  'invoices',
  'meetings',
  'junkMessages',
  'newEmails',
  'importantEmails',
  'emailsReceived',
  'requiresAttention'
];

const SSE_EVENT_TYPES = [
  'stats',
  'contacts',
  'chart',
  'done',
  'error',
  ...ALL_BLOCK_IDS.map((id) => `${BLOCK_EVENT_PREFIX}${id}`)
] as const;

interface StatsPayload {
  totalProcessed: number;
  generatedAt: string;
}

interface BlockPayload {
  blockId: DigestBlockId;
  block: DigestBlockDto;
}

interface ContactsPayload {
  contacts: TopContactDto[];
}

interface ChartPayload {
  series: SentReceivedDayDto[];
}

interface ErrorPayload {
  message: string;
}

export const digestStreamEpic: Epic<RootAction, RootAction, RootState> = (action$) =>
  action$.pipe(
    filter(isActionOf(digestActions.requestStream)),
    switchMap((action) => {
      const url = buildStreamUrl(action.payload);
      const stop$ = action$.pipe(
        filter(
          (next) =>
            isActionOf(digestActions.streamComplete)(next) ||
            isActionOf(digestActions.streamFailure)(next) ||
            isActionOf(digestActions.requestStream)(next)
        )
      );

      return createSseObservable(url, SSE_EVENT_TYPES).pipe(
        map((message): RootAction | null => {
          switch (message.type) {
            case 'stats': {
              const payload = message.data as StatsPayload;
              return digestActions.statsReceived({
                totalProcessed: payload.totalProcessed,
                generatedAt: payload.generatedAt
              });
            }
            case 'contacts': {
              const payload = message.data as ContactsPayload;
              return digestActions.contactsReceived(payload.contacts);
            }
            case 'chart': {
              const payload = message.data as ChartPayload;
              return digestActions.chartReceived(payload.series);
            }
            case 'done':
              return digestActions.streamComplete();
            case 'error': {
              const payload = message.data as ErrorPayload;
              return digestActions.streamFailure({ message: payload.message ?? 'Digest stream failed' });
            }
            default: {
              if (message.type.startsWith(BLOCK_EVENT_PREFIX)) {
                const payload = message.data as BlockPayload;
                return digestActions.blockReceived({
                  blockId: payload.blockId,
                  block: payload.block
                });
              }
              return null;
            }
          }
        }),
        filter((emitted): emitted is RootAction => emitted !== null),
        catchError((error: SseError) => {
          // 'unauthorized' is already handled by createSseObservable
          // (redirectToLogout). For other reasons surface to reducer so UI
          // can render the error state.
          if (error.reason === 'unauthorized') {
            return EMPTY;
          }
          return of(digestActions.streamFailure({ message: error.message }));
        }),
        takeUntil(stop$)
      );
    })
  );

function buildStreamUrl(request: DigestStreamRequest): string {
  const params = new URLSearchParams();
  params.set('folder', request.folder);

  return `${STREAM_PATH}?${params.toString()}`;
}
