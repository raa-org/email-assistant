/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { combineReducers } from 'redux';
import { appReducer } from './app/reducer';
import { briefingReducer } from './briefing/reducer';
import { digestReducer } from './digest/reducer';
import { enrichmentReducer } from './enrichment/reducer';
import { inboxReducer } from './inbox/reducer';
import { mailReducer } from './mail/reducer';
import { userReducer } from './user/reducer';

export const rootReducer = combineReducers({
  app: appReducer,
  briefing: briefingReducer,
  digest: digestReducer,
  enrichment: enrichmentReducer,
  inbox: inboxReducer,
  mail: mailReducer,
  user: userReducer
});
