/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { createSelector } from 'reselect';
import type { RootState } from '../root-state';

const selectAppState = (state: RootState) => state.app;

export const selectAppLoading = createSelector(selectAppState, (app) => app.loading);
export const selectAppInitialized = createSelector(selectAppState, (app) => app.initialized);
export const selectAppError = createSelector(selectAppState, (app) => app.error);
export const selectThemeMode = createSelector(selectAppState, (app) => app.themeMode);
export const selectIsDarkMode = createSelector(selectThemeMode, (mode) => mode === 'dark');
