/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { SentReceivedDayDto } from '@raa/assistant/common';

export class DigestChartReadyEvent {
  constructor(
    public readonly userId: string,
    public readonly series: SentReceivedDayDto[]
  ) {}
}
