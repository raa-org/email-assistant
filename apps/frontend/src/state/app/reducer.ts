/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { ActionType, createReducer } from 'typesafe-actions';
import { appActions, type ThemeMode } from './actions';

export interface AppState {
  initialized: boolean;
  loading: boolean;
  error: string | null;
  themeMode: ThemeMode;
}

const initialState: AppState = {
  initialized: false,
  loading: false,
  error: null,
  themeMode: 'dark'
};

type AppAction = ActionType<typeof appActions>;

export const appReducer = createReducer<AppState, AppAction>(initialState)
  .handleAction(appActions.bootstrapRequest, (state) => ({
    ...state,
    loading: true,
    error: null
  }))
  .handleAction(appActions.bootstrapSuccess, (state) => ({
    ...state,
    initialized: true,
    loading: false,
    error: null
  }))
  .handleAction(appActions.bootstrapFailure, (state, action) => ({
    ...state,
    loading: false,
    error: action.payload.message
  }))
  .handleAction(appActions.setThemeMode, (state, action) => ({
    ...state,
    themeMode: action.payload
  }))
  .handleAction(appActions.toggleThemeMode, (state) => ({
    ...state,
    themeMode: state.themeMode === 'light' ? 'dark' : 'light'
  }));
