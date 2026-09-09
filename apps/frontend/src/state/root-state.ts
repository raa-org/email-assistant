/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { StateType } from 'typesafe-actions';
import { rootReducer } from './root-reducer';

export type RootState = StateType<typeof rootReducer>;
