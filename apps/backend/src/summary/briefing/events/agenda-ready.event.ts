/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { AgendaResultDto } from '@raa/assistant/common';

export class AgendaReadyEvent {
  constructor(
    public readonly userId: string,
    public readonly result: AgendaResultDto
  ) {}
}
