/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { redirect } from 'next/navigation';
import { getAppBaseUrl } from '../../../src/lib/runtime-url';

export default function SignInPage(): never {
  const appBaseUrl = getAppBaseUrl();
  const loginUrl = new URL('/api/auth/login', appBaseUrl);

  loginUrl.searchParams.set('returnTo', new URL('/digest', appBaseUrl).toString());

  redirect(loginUrl.toString());
}
