/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client';

import type { CurrentUserDto } from '@raa/assistant/common';
import { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { appActions, type ThemeMode } from '../app/actions';
import { userActions } from '../user/actions';
import { createAppStore, type AppStore } from '../store';
import { MuiThemeProvider } from '../../theme/mui-theme-provider';

const THEME_KEY = 'raa-assistant.theme-mode';
const THEME_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

interface Props {
  children: React.ReactNode;
  initialTheme?: ThemeMode;
  initialUser?: CurrentUserDto | null;
}

export function StoreProvider({ children, initialTheme = 'dark', initialUser = null }: Readonly<Props>) {
  const storeRef = useRef<AppStore | null>(null);

  if (storeRef.current === null) {
    storeRef.current = createAppStore();
    // Apply the server-resolved theme synchronously before first render.
    // initialTheme is read from a cookie on the server, so both server and
    // client agree on the initial value — no hydration mismatch.
    if (initialTheme !== 'dark') {
      storeRef.current.dispatch(appActions.setThemeMode(initialTheme));
    }
    // Same pattern for the authenticated user — fetched server-side from the
    // session cookie so identity is present from the very first paint.
    if (initialUser) {
      storeRef.current.dispatch(userActions.hydrate(initialUser));
    }
  }

  useEffect(() => {
    storeRef.current?.dispatch(appActions.bootstrapRequest());
  }, []);

  useEffect(() => {
    const unsubscribe = storeRef.current?.subscribe(() => {
      const themeMode = storeRef.current?.getState().app.themeMode;

      if (themeMode) {
        // Persist to localStorage (legacy fallback) and cookie (server reads on next load).
        window.localStorage.setItem(THEME_KEY, themeMode);
        document.cookie = `${THEME_KEY}=${themeMode};path=/;max-age=${THEME_COOKIE_MAX_AGE};SameSite=Lax`;
        // Keep data-theme in sync for the CSS canvas variable.
        document.documentElement.setAttribute('data-theme', themeMode);
      }
    });

    return () => unsubscribe?.();
  }, []);

  return (
    <Provider store={storeRef.current}>
      <MuiThemeProvider>{children}</MuiThemeProvider>
    </Provider>
  );
}
