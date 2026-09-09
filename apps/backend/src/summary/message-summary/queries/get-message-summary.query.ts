/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

// Returns the stored summary for (userId, folder, messageUid) if-and-only-if
// (bodyHash, llmModel, llmProvider) all match the persisted row. Otherwise the
// handler resolves to null so the caller can trigger a fresh LLM call.
export class GetMessageSummaryQuery {
  constructor(
    public readonly userId: string,
    public readonly folder: string,
    public readonly messageUid: string,
    public readonly bodyHash: string,
    public readonly promptVersion: string,
    public readonly llmModel: string,
    public readonly llmProvider: string
  ) {}
}
