/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { createSelector } from 'reselect';
import type { RootState } from '../root-state';

const selectMailState = (state: RootState) => state.mail;

export const selectInboxMessages = createSelector(selectMailState, (mail) => mail.messages);
export const selectSelectedMessageUid = createSelector(selectMailState, (mail) => mail.selectedMessageUid);

export const selectSelectedMessage = createSelector(
  [selectInboxMessages, selectSelectedMessageUid],
  (messages, selectedMessageUid) => messages.find((message) => message.uid === selectedMessageUid) ?? null
);

export const selectMessageByUid = (uid: string) =>
  createSelector(selectInboxMessages, (messages) => messages.find((message) => message.uid === uid) ?? null);
