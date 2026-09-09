/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { createAction } from 'typesafe-actions';
import type { BootstrapPayload } from '../bootstrap/bootstrap-data';

export type ThemeMode = 'light' | 'dark';

export const appActions = {
  bootstrapRequest: createAction('app/bootstrap/request')(),
  bootstrapSuccess: createAction('app/bootstrap/success')<BootstrapPayload>(),
  bootstrapFailure: createAction('app/bootstrap/failure')<{ message: string }>(),
  setThemeMode: createAction('app/set-theme-mode')<ThemeMode>(),
  toggleThemeMode: createAction('app/toggle-theme-mode')()
};
