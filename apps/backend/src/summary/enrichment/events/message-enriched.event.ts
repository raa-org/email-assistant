/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { MailMessageDto, SummaryResultDto } from '@raa/assistant/common';

export class MessageEnrichedEvent {
  constructor(
    public readonly userId: string,
    public readonly correlationId: string,
    public readonly envelope: MailMessageDto,
    public readonly summary: SummaryResultDto | null,
    public readonly error?: string
  ) {}
}
