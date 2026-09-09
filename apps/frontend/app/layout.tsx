/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import './globals.css';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { fetchCurrentUser } from '../src/lib/server/current-user';
import type { ThemeMode } from '../src/state/app/actions';
import { StoreProvider } from '../src/state/providers/store-provider';

const THEME_COOKIE = 'raa-assistant.theme-mode';
const APP_PATHNAME_HEADER = 'x-app-pathname';

// Fallback inline script: sets data-theme on <html> from localStorage before
// <body> is parsed. Guards against cookies being disabled or stale first load.
const themeInitScript = `(function(){try{var t=localStorage.getItem('raa-assistant.theme-mode');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark')}catch(e){document.documentElement.setAttribute('data-theme','dark')}})()`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const stored = cookieStore.get(THEME_COOKIE)?.value;
  const initialTheme: ThemeMode = stored === 'light' ? 'light' : 'dark';
  const userResult = await fetchCurrentUser();
  const pathname = headerList.get(APP_PATHNAME_HEADER) ?? '/';

  // Stale cookie: backend rejected the session (Keycloak refresh-token
  // expired, session revoked, etc). Drop the dead cookie via /auth/logout
  // and let the OIDC end-session → fresh login flow take over. Skip on the
  // auth pages themselves to avoid a redirect loop.
  if (userResult.status === 'unauthenticated' && !isAuthRoute(pathname)) {
    const logoutUrl = `/auth/logout?returnTo=${encodeURIComponent(pathname)}`;

    redirect(logoutUrl);
  }

  const initialUser = userResult.status === 'authenticated' ? userResult.user : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <AppRouterCacheProvider options={{ key: 'css' }}>
          <StoreProvider initialTheme={initialTheme} initialUser={initialUser}>
            {children}
          </StoreProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}

function isAuthRoute(pathname: string): boolean {
  return pathname === '/auth/signin' || pathname === '/auth/logout';
}
