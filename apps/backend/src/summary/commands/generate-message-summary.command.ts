/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { MailAuthContext } from '../../mail/mail.types.js';
import type { LlmRequestOptions } from '../../provider/provider.types.js';

export class GenerateMessageSummaryCommand {
  constructor(
    public readonly userId: string,
    public readonly uid: string,
    public readonly folder: string,
    public readonly auth: MailAuthContext,
    public readonly llm?: LlmRequestOptions
  ) {}
}
