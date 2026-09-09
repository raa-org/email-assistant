/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { MailAuthContext } from '../../mail/mail.types.js';
import type { LlmRequestOptions } from '../../provider/provider.types.js';

export class GenerateBatchSummaryCommand {
  constructor(
    public readonly folder: string,
    public readonly auth: MailAuthContext,
    public readonly limit = 10,
    public readonly llm?: LlmRequestOptions
  ) {}
}
