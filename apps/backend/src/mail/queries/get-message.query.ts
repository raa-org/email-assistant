/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { MailAuthContext } from '../mail.types.js';

export class GetMessageQuery {
  constructor(
    public readonly uid: string,
    public readonly folder: string,
    public readonly auth: MailAuthContext
  ) {}
}
