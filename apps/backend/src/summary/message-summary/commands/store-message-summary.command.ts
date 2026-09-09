/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { SummaryResultDto } from '@raa/assistant/common';

export class StoreMessageSummaryCommand {
  constructor(
    public readonly userId: string,
    public readonly folder: string,
    public readonly messageUid: string,
    public readonly bodyHash: string,
    public readonly promptVersion: string,
    public readonly llmModel: string,
    public readonly llmProvider: string,
    public readonly payload: SummaryResultDto
  ) {}
}
