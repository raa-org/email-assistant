/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client';

import { applyMiddleware, compose, legacy_createStore as createStore, type Store } from 'redux';
import { createEpicMiddleware } from 'redux-observable';
import type { RootAction } from './root-action';
import { rootEpic } from './root-epic';
import { rootReducer } from './root-reducer';
import type { RootState } from './root-state';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
  }
}

export type AppStore = Store<RootState, RootAction>;
export type AppDispatch = AppStore['dispatch'];

export function createAppStore(): AppStore {
  const epicMiddleware = createEpicMiddleware<RootAction, RootAction, RootState>();
  const composeEnhancers =
    typeof window !== 'undefined' ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?? compose : compose;

  const store = createStore(rootReducer, undefined, composeEnhancers(applyMiddleware(epicMiddleware)));

  epicMiddleware.run(rootEpic);

  return store;
}
