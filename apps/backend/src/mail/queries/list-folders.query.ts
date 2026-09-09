/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { MailAuthContext } from '../mail.types.js';

export class ListFoldersQuery {
  constructor(public readonly auth: MailAuthContext) {}
}
