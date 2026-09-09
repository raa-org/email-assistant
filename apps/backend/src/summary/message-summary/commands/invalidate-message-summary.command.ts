/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

// Removes stored summaries for a user. If `messageUid` is omitted, removes
// every row in the given folder for that user (used e.g. after a folder-wide
// change like Mark-all-read or model rotation).
export class InvalidateMessageSummaryCommand {
  constructor(
    public readonly userId: string,
    public readonly folder: string,
    public readonly messageUid?: string
  ) {}
}
