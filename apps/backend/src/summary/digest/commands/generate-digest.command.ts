/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { MailAuthContext } from '../../../mail/mail.types.js';
import type { LlmRequestOptions } from '../../../provider/provider.types.js';

// Digest content is ALWAYS "all unread" — there is no time bound on what gets
// classified, so a user returning from a 2-week vacation still sees every
// piece of mail they have not read yet. The fixed-day stats window for top
// contacts and the sent/received chart is read separately by the handler from
// AppEnv.digestStatsWindowDays.
export class GenerateDigestCommand {
  constructor(
    public readonly userId: string,
    public readonly auth: MailAuthContext,
    public readonly folder: string,
    public readonly llm?: LlmRequestOptions
  ) {}
}
