/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

export class AgendaFailedEvent {
  constructor(
    public readonly userId: string,
    public readonly message: string
  ) {}
}
