/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { createSelector } from 'reselect';
import type { RootState } from '../root-state';

const selectInboxState = (state: RootState) => state.inbox;

export const selectActiveTab = createSelector(selectInboxState, (inbox) => inbox.activeTab);
export const selectShowNewOnly = createSelector(selectInboxState, (inbox) => inbox.showNewOnly);
export const selectSearchQuery = createSelector(selectInboxState, (inbox) => inbox.searchQuery);
export const selectInboxLoading = createSelector(selectInboxState, (inbox) => inbox.loading);
export const selectInboxError = createSelector(selectInboxState, (inbox) => inbox.error);

export const selectInboxMessages = createSelector(selectInboxState, (inbox) => inbox.messages);

// Client-side filter on top of server-fetched set: "show new only" hides
// read messages without re-fetching from IMAP.
export const selectFilteredMessages = createSelector(
  [selectInboxMessages, selectShowNewOnly],
  (messages, showNewOnly) =>
    showNewOnly ? messages.filter((m) => m.isUnread) : messages
);

export const selectUnreadCount = createSelector(
  selectInboxMessages,
  (messages) => messages.filter((m) => m.isUnread).length
);

// IMAP STATUS counts (cheap, no message enumeration)
export const selectFolderTotal = createSelector(selectInboxState, (inbox) => inbox.folderTotal);
export const selectFolderUnread = createSelector(selectInboxState, (inbox) => inbox.folderUnread);

// Detail panel
export const selectSelectedUid = createSelector(selectInboxState, (inbox) => inbox.selectedUid);
export const selectMessageDetail = createSelector(selectInboxState, (inbox) => inbox.messageDetail);
export const selectMessageDetailLoading = createSelector(selectInboxState, (inbox) => inbox.messageDetailLoading);
export const selectMessageSummary = createSelector(selectInboxState, (inbox) => inbox.summary);
export const selectSummaryLoading = createSelector(selectInboxState, (inbox) => inbox.summaryLoading);
export const selectSummaryStreamingText = createSelector(selectInboxState, (inbox) => inbox.summaryStreamingText);
export const selectPanelOpen = createSelector(selectSelectedUid, (uid) => uid !== null);
