/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { MailMessageDetailDto, MailMessageDto } from '@raa/assistant/common';

export class MessageBodyFetchedEvent {
  constructor(
    public readonly userId: string,
    public readonly correlationId: string,
    public readonly envelope: MailMessageDto,
    public readonly message: MailMessageDetailDto,
    public readonly llmModel: string,
    public readonly llmProvider: string
  ) {}
}
