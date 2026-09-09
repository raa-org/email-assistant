/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAppBaseUrl, getAuthCookieName } from './src/lib/runtime-url';

// Forward the current pathname to RSC layouts via a request header so they can
// decide whether to run auth-redirect logic for the given route (e.g. skip on
// /auth/* pages where the user is already mid-flow).
const APP_PATHNAME_HEADER = 'x-app-pathname';

function passthrough(request: NextRequest): NextResponse {
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set(APP_PATHNAME_HEADER, request.nextUrl.pathname);

  return NextResponse.next({ request: { headers: forwardedHeaders } });
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname === '/auth/signin' ||
    request.nextUrl.pathname === '/auth/logout'
  ) {
    return passthrough(request);
  }

  const authCookieName = getAuthCookieName();

  if (request.cookies.has(authCookieName)) {
    return passthrough(request);
  }

  const loginUrl = new URL('/api/auth/login', getAppBaseUrl());

  loginUrl.searchParams.set('returnTo', request.nextUrl.toString());

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};
