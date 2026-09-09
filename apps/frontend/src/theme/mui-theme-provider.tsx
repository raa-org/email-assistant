/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client';

import { CssBaseline, ThemeProvider } from '@mui/material';
import { useMemo } from 'react';
import { useAppSelector } from '../state/hooks';
import { selectThemeMode } from '../state/app/selectors';
import { createAppTheme } from './create-app-theme';

export function MuiThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const mode = useAppSelector(selectThemeMode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
