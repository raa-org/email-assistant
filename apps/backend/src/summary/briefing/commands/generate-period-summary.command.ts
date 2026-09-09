/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { SummaryPeriodDto } from '@raa/assistant/common';
import type { MailAuthContext } from '../../../mail/mail.types.js';
import type { LlmRequestOptions } from '../../../provider/provider.types.js';

export class GeneratePeriodSummaryCommand {
  constructor(
    public readonly userId: string,
    public readonly auth: MailAuthContext,
    public readonly folder: string,
    public readonly period: SummaryPeriodDto,
    public readonly unreadOnly?: boolean,
    public readonly llm?: LlmRequestOptions,
    public readonly force?: boolean
  ) {}
}
