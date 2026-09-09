/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { createAction } from 'typesafe-actions';
import type { MailMessageDetailDto } from '@raa/assistant/common';

export const mailActions = {
  hydrateMessages: createAction('mail/hydrate-messages')<MailMessageDetailDto[]>(),
  selectMessage: createAction('mail/select-message')<string>()
};
