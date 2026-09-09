/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

export class DigestStatsReadyEvent {
  constructor(
    public readonly userId: string,
    public readonly totalProcessed: number,
    public readonly generatedAt: string
  ) {}
}
