/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { PeriodSummaryResultDto } from '@raa/assistant/common';

export class PeriodSummaryReadyEvent {
  constructor(
    public readonly userId: string,
    public readonly result: PeriodSummaryResultDto
  ) {}
}
