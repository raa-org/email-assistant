/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { ActionType } from 'typesafe-actions';
import { appActions } from './app/actions';
import { briefingActions } from './briefing/actions';
import { digestActions } from './digest/actions';
import { inboxActions } from './inbox/actions';
import { mailActions } from './mail/actions';
import { userActions } from './user/actions';

export const rootActions = {
  app: appActions,
  briefing: briefingActions,
  digest: digestActions,
  inbox: inboxActions,
  mail: mailActions,
  user: userActions
};

export type RootAction = ActionType<typeof rootActions>;
