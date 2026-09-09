/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client';

import type { Epic } from 'redux-observable';
import { catchError, debounceTime, distinctUntilChanged, filter, from, map, mergeMap, of, switchMap } from 'rxjs';
import { isActionOf } from 'typesafe-actions';
import { fetchFolderStats, fetchMessages } from '../../lib/api/mail-client';
import type { RootAction } from '../root-action';
import type { RootState } from '../root-state';
import { inboxActions, type InboxTab } from './actions';

// Maps the visual tab to a (since, before) pair. "All" has no time bound;
// "Custom" is handled by the caller passing explicit dates.
function tabToDateRange(tab: InboxTab): { since?: string; before?: string } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (tab) {
    case 'today': {
      return { since: startOfToday.toISOString() };
    }
    case 'yesterday': {
      const yesterday = new Date(startOfToday);
      yesterday.setDate(yesterday.getDate() - 1);
      return { since: yesterday.toISOString(), before: startOfToday.toISOString() };
    }
    case '3days': {
      const threeDaysAgo = new Date(startOfToday);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      return { since: threeDaysAgo.toISOString() };
    }
    case '7days': {
      const sevenDaysAgo = new Date(startOfToday);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return { since: sevenDaysAgo.toISOString() };
    }
    default:
      return {};
  }
}

// Triggers a backend fetch when the user changes tab, search, or unreadOnly
// toggle. Debounces search input by 250ms. Tab/toggle changes fire immediately.
export const inboxFetchEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) =>
  action$.pipe(
    filter(
      (action) =>
        isActionOf(inboxActions.setActiveTab)(action) ||
        isActionOf(inboxActions.setShowNewOnly)(action) ||
        isActionOf(inboxActions.setSearchQuery)(action) ||
        isActionOf(inboxActions.requestMessages)(action)
    ),
    debounceTime(150),
    map(() => {
      const { activeTab, searchQuery, showNewOnly } = state$.value.inbox;
      const range = tabToDateRange(activeTab);

      return {
        folder: 'INBOX',
        tab: activeTab,
        search: searchQuery.trim() || undefined,
        unreadOnly: showNewOnly || undefined,
        since: range.since,
        before: range.before
      };
    }),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    switchMap((params) =>
      from(
        fetchMessages({
          folder: params.folder,
          limit: 50,
          search: params.search,
          since: params.since,
          before: params.before,
          unreadOnly: params.unreadOnly
        })
      ).pipe(
        map((messages) => inboxActions.messagesLoaded(messages)),
        catchError((error) =>
          of(inboxActions.messagesFailed({ message: error instanceof Error ? error.message : 'Fetch failed' }))
        )
      )
    )
  );

// Lightweight: fetches folder-level counts from IMAP STATUS on initial load.
// Fires once per requestMessages action (which includes the first mount).
export const folderStatsEpic: Epic<RootAction, RootAction, RootState> = (action$) =>
  action$.pipe(
    filter(isActionOf(inboxActions.requestMessages)),
    mergeMap(() =>
      from(fetchFolderStats('INBOX')).pipe(
        map((stats) => inboxActions.folderStatsLoaded(stats)),
        catchError(() => of(inboxActions.folderStatsLoaded({ total: 0, unread: 0 })))
      )
    )
  );
