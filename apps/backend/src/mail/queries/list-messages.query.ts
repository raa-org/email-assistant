/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { MailAuthContext } from '../mail.types.js';

export class ListMessagesQuery {
  constructor(
    public readonly folder: string,
    public readonly auth: MailAuthContext,
    public readonly limit: number,
    public readonly offset: number,
    public readonly search?: string,
    public readonly since?: Date,
    public readonly before?: Date,
    public readonly unreadOnly?: boolean
  ) {}
}
