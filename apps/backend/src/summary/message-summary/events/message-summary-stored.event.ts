/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

export class MessageSummaryStoredEvent {
  constructor(
    public readonly userId: string,
    public readonly folder: string,
    public readonly messageUid: string,
    public readonly llmModel: string,
    public readonly llmProvider: string
  ) {}
}
