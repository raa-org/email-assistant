/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { CurrentUserDto } from '@raa/assistant/common';
import { createAction } from 'typesafe-actions';

export const userActions = {
  hydrate: createAction('user/hydrate')<CurrentUserDto>(),
  clear: createAction('user/clear')()
};
