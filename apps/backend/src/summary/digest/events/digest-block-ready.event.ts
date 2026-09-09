/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { DigestBlockDto, DigestBlockId } from '@raa/assistant/common';

export class DigestBlockReadyEvent {
  constructor(
    public readonly userId: string,
    public readonly blockId: DigestBlockId,
    public readonly block: DigestBlockDto
  ) {}
}
