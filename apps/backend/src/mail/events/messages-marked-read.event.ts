/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

export class MessagesMarkedReadEvent {
  constructor(
    public readonly folder: string,
    public readonly markedCount: number
  ) {}
}
