/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { CurrentUserDto } from '@raa/assistant/common';
import { cookies } from 'next/headers';
import { getInternalBackendUrl } from '../runtime-url';

// Discriminated result of /api/auth/me lookup. Caller decides what to do:
//   - 'authenticated': hydrate user slice
//   - 'unauthenticated': cookie missing OR backend rejected (stale/expired session)
//                        → redirect to /auth/logout to clear the dead cookie and
//                        re-enter the OIDC flow
//   - 'unreachable': backend network/5xx — do NOT redirect (would lock the user
//                    out during transient outages); render a degraded UI instead
export type CurrentUserResult =
  | { status: 'authenticated'; user: CurrentUserDto }
  | { status: 'unauthenticated' }
  | { status: 'unreachable' };

export async function fetchCurrentUser(): Promise<CurrentUserResult> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');

  if (!cookieHeader) {
    return { status: 'unauthenticated' };
  }

  let response: Response;

  try {
    response = await fetch(new URL('/api/auth/me', getInternalBackendUrl()), {
      headers: { cookie: cookieHeader },
      cache: 'no-store'
    });
  } catch {
    return { status: 'unreachable' };
  }

  if (response.status === 401 || response.status === 403) {
    return { status: 'unauthenticated' };
  }

  if (!response.ok) {
    return { status: 'unreachable' };
  }

  const user = (await response.json()) as CurrentUserDto;

  return { status: 'authenticated', user };
}
