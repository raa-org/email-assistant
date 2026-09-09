/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

export class GetBriefingQuery {
  constructor(
    public readonly userId: string,
    public readonly folder: string,
    public readonly kind: string,
    public readonly dateFrom: string,
    public readonly dateTo: string,
    public readonly type: 'summary' | 'agenda',
    public readonly messageCount: number,
    public readonly uidsHash: string,
    public readonly llmParamsHash: string
  ) {}
}
