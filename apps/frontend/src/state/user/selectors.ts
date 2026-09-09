/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { createSelector } from 'reselect';
import type { RootState } from '../root-state';

const selectUserState = (state: RootState) => state.user;

export const selectCurrentUser = createSelector(selectUserState, (user) => user.current);

export const selectUserDisplayName = createSelector(
  selectCurrentUser,
  (user) => user?.displayName ?? null
);

export const selectUserEmail = createSelector(
  selectCurrentUser,
  (user) => user?.email ?? null
);

export const selectUserInitials = createSelector(selectUserDisplayName, (displayName) => {
  if (!displayName) {
    return null;
  }

  const parts = displayName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return null;
  }

  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';

  return `${first}${second}`.toUpperCase();
});
