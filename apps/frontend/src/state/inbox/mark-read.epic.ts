/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client';

import type { Epic } from 'redux-observable';
import { catchError, filter, from, map, mergeMap, of } from 'rxjs';
import { isActionOf } from 'typesafe-actions';
import { markMessagesRead } from '../../lib/api/mail-client';
import type { RootAction } from '../root-action';
import type { RootState } from '../root-state';
import { inboxActions } from './actions';

export const markReadEpic: Epic<RootAction, RootAction, RootState> = (action$) =>
  action$.pipe(
    filter(
      (action) =>
        isActionOf(inboxActions.markRead)(action) ||
        isActionOf(inboxActions.markAllRead)(action)
    ),
    mergeMap((action) => {
      const folder = action.payload.folder;
      const target = isActionOf(inboxActions.markAllRead)(action)
        ? { allUnread: true as const }
        : { uids: [(action.payload as { folder: string; uid: string }).uid] };

      return from(markMessagesRead(target, folder)).pipe(
        map(() => {
          const uids = 'uids' in target ? target.uids : [];
          return inboxActions.markReadSuccess({ uids });
        }),
        catchError((error) =>
          of(inboxActions.markReadFailure({ message: error instanceof Error ? error.message : 'Mark read failed' }))
        )
      );
    })
  );
