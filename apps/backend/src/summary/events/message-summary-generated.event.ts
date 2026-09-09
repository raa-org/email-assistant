/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { SummaryResultDto } from '@raa/assistant/common';

export class MessageSummaryGeneratedEvent {
  constructor(
    public readonly uid: string,
    public readonly result: SummaryResultDto
  ) {}
}
