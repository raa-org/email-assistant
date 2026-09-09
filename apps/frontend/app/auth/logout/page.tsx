/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { redirect } from 'next/navigation';
import { getAppBaseUrl } from '../../../src/lib/runtime-url';

interface PageProps {
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function LogoutPage({ searchParams }: PageProps): Promise<never> {
  const appBaseUrl = getAppBaseUrl();
  const params = await searchParams;
  const logoutUrl = new URL('/api/auth/logout', appBaseUrl);
  // returnTo is the path to land on AFTER the full OIDC end-session →
  // re-login round trip. Defaults to the app root when not supplied. Always
  // resolved against the app origin so backend's allow-list accepts it.
  const returnTo = new URL(params.returnTo ?? '/', appBaseUrl).toString();

  logoutUrl.searchParams.set('returnTo', returnTo);

  redirect(logoutUrl.toString());
}
