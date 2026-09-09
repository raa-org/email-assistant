/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { MailAuthContext } from '../mail.types.js';
import type { MarkReadTarget } from '../mail.write-service.js';

export class MarkMessagesReadCommand {
  constructor(
    public readonly auth: MailAuthContext,
    public readonly folder: string,
    public readonly target: MarkReadTarget
  ) {}
}
