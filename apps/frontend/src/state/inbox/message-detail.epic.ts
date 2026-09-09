/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client';

import type { SummaryResultDto } from '@raa/assistant/common';
import type { Epic } from 'redux-observable';
import { catchError, EMPTY, filter, from, map, mergeMap, of, switchMap } from 'rxjs';
import { isActionOf } from 'typesafe-actions';
import { fetchMessageDetail } from '../../lib/api/mail-client';
import { createSseObservable, type SseError } from '../../lib/api/sse';
import type { RootAction } from '../root-action';
import type { RootState } from '../root-state';
import { inboxActions } from './actions';

// When a message is selected, fetch its full detail (IMAP) and mark as read.
export const messageDetailEpic: Epic<RootAction, RootAction, RootState> = (action$) =>
  action$.pipe(
    filter(isActionOf(inboxActions.selectMessage)),
    switchMap((action) => {
      const { uid, folder } = action.payload;

      return from(fetchMessageDetail(uid, folder)).pipe(
        mergeMap((detail) =>
          from([
            inboxActions.messageDetailLoaded(detail),
            inboxActions.markRead({ folder, uid })
          ])
        ),
        catchError((error) =>
          of(inboxActions.messageDetailFailed({
            message: error instanceof Error ? error.message : 'Failed to load message'
          }))
        )
      );
    })
  );

const SUMMARY_SSE_EVENTS = ['chunk', 'result', 'done', 'error'] as const;

// Stream summary via SSE — shows LLM output progressively as it generates.
// Cache hits arrive as a single 'result' event (no chunks).
// Re-summarize requests use ?force=true to skip cache.
export const messageSummaryEpic: Epic<RootAction, RootAction, RootState> = (action$) =>
  action$.pipe(
    filter(
      (action) =>
        isActionOf(inboxActions.selectMessage)(action) ||
        isActionOf(inboxActions.requestResummarize)(action)
    ),
    switchMap((action) => {
      const { uid, folder } = action.payload;
      const force = isActionOf(inboxActions.requestResummarize)(action);
      const url = `/api/summary/message/stream?uid=${encodeURIComponent(uid)}&folder=${encodeURIComponent(folder)}${force ? '&force=true' : ''}`;

      return createSseObservable(url, SUMMARY_SSE_EVENTS).pipe(
        map((message): RootAction | null => {
          switch (message.type) {
            case 'chunk': {
              const data = message.data as { content: string; accumulated: string };
              return inboxActions.summaryChunk({ content: data.content, accumulated: data.accumulated });
            }
            case 'result': {
              const data = message.data as SummaryResultDto;
              return inboxActions.summaryLoaded(data);
            }
            case 'done':
              return null;
            case 'error': {
              const data = message.data as { message: string };
              return inboxActions.summaryFailed({ message: data.message });
            }
            default:
              return null;
          }
        }),
        filter((emitted): emitted is RootAction => emitted !== null),
        catchError((error: SseError) => {
          if (error.reason === 'unauthorized') {
            return EMPTY;
          }
          return of(inboxActions.summaryFailed({ message: error.message }));
        })
      );
    })
  );
