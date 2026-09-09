/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

// Bulk lookup of stored summaries for a list of message UIDs in one folder.
// Returns a Map<uid, StoredMessageSummary> containing only the entries that
// match the requested (llmModel, llmProvider) pair — rows for other models
// are treated as misses so the caller can re-summarize with the correct model.
//
// Body-hash is intentionally NOT checked here. Email bodies in IMAP are
// effectively immutable (RFC + MUA convention). Skipping the hash check
// avoids the per-message IMAP fetchOne that would otherwise be required just
// to compute a hash for cache validation. Single-message endpoint paths still
// validate by hash via GetMessageSummaryQuery.
export class GetMessageSummariesByUidsQuery {
  constructor(
    public readonly userId: string,
    public readonly folder: string,
    public readonly messageUids: string[],
    public readonly promptVersion: string,
    public readonly llmModel: string,
    public readonly llmProvider: string
  ) {}
}
