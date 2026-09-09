/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { combineEpics, type Epic } from 'redux-observable';
import { filter, from, map, of, switchMap } from 'rxjs';
import { isActionOf } from 'typesafe-actions';
import { getBootstrapPayload } from './bootstrap/bootstrap-data';
import { appActions } from './app/actions';
import { briefingEpic } from './briefing/briefing-stream.epic';
import { digestActions } from './digest/actions';
import { digestStreamEpic } from './digest/digest-stream.epic';
import { enrichmentEpic } from './enrichment/enrichment-stream.epic';
import { folderStatsEpic, inboxFetchEpic } from './inbox/inbox-fetch.epic';
import { markReadEpic } from './inbox/mark-read.epic';
import { messageDetailEpic, messageSummaryEpic } from './inbox/message-detail.epic';
import { mailActions } from './mail/actions';
import type { RootAction } from './root-action';
import type { RootState } from './root-state';

const bootstrapEpic: Epic<RootAction, RootAction, RootState> = (action$) =>
  action$.pipe(
    filter(isActionOf(appActions.bootstrapRequest)),
    switchMap(() => {
      try {
        const payload = getBootstrapPayload();

        return from([
          digestActions.hydratePresets(payload.digestPresets),
          mailActions.hydrateMessages(payload.inboxMessages),
          appActions.bootstrapSuccess(payload)
        ]);
      } catch (error) {
        return of(
          appActions.bootstrapFailure({
            message: error instanceof Error ? error.message : 'Unknown bootstrap error'
          })
        );
      }
    })
  );

const selectDefaultMessageEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) =>
  action$.pipe(
    filter(isActionOf(mailActions.hydrateMessages)),
    filter((action) => action.payload.length > 0 && state$.value.mail.selectedMessageUid === null),
    map((action) => mailActions.selectMessage(action.payload[0].uid))
  );

export const rootEpic = combineEpics(
  bootstrapEpic,
  selectDefaultMessageEpic,
  enrichmentEpic,
  briefingEpic,
  digestStreamEpic,
  inboxFetchEpic,
  folderStatsEpic,
  markReadEpic,
  messageDetailEpic,
  messageSummaryEpic
);
