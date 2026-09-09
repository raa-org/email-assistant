/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { ActionType, createReducer } from 'typesafe-actions';
import type { MailMessageDetailDto } from '@raa/assistant/common';
import { mailActions } from './actions';

export interface MailState {
  messages: MailMessageDetailDto[];
  selectedMessageUid: string | null;
}

const initialState: MailState = {
  messages: [],
  selectedMessageUid: null
};

type MailAction = ActionType<typeof mailActions>;

export const mailReducer = createReducer<MailState, MailAction>(initialState)
  .handleAction(mailActions.hydrateMessages, (state, action) => ({
    ...state,
    messages: action.payload,
    selectedMessageUid: state.selectedMessageUid ?? action.payload[0]?.uid ?? null
  }))
  .handleAction(mailActions.selectMessage, (state, action) => ({
    ...state,
    selectedMessageUid: action.payload
  }));
