/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

export class EnsureUserFromOidcCommand {
  constructor(
    public readonly oidcSubject: string,
    public readonly email: string,
    public readonly displayName: string,
    public readonly loggedInAt: Date
  ) {}
}
