/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { TopContactDto } from '@raa/assistant/common';

export class DigestContactsReadyEvent {
  constructor(
    public readonly userId: string,
    public readonly contacts: TopContactDto[]
  ) {}
}
