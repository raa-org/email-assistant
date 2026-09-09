/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

export class DigestFailedEvent {
  constructor(
    public readonly userId: string,
    public readonly message: string
  ) {}
}
