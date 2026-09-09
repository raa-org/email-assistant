/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { CurrentUserDto } from '@raa/assistant/common';
import { ActionType, createReducer } from 'typesafe-actions';
import { userActions } from './actions';

export interface UserState {
  current: CurrentUserDto | null;
}

const initialState: UserState = {
  current: null
};

type UserAction = ActionType<typeof userActions>;

export const userReducer = createReducer<UserState, UserAction>(initialState)
  .handleAction(userActions.hydrate, (state, action) => ({
    ...state,
    current: action.payload
  }))
  .handleAction(userActions.clear, (state) => ({
    ...state,
    current: null
  }));
