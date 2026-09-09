/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client';

import Link from 'next/link';
import DarkModeRounded from '@mui/icons-material/DarkModeRounded';
import LightModeRounded from '@mui/icons-material/LightModeRounded';
import { AppBar, Box, Button, IconButton, Stack, Toolbar, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../state/hooks';
import { appActions } from '../../state/app/actions';
import { selectIsDarkMode } from '../../state/app/selectors';

export function MainNav() {
  const dispatch = useAppDispatch();
  const isDarkMode = useAppSelector(selectIsDarkMode);

  return (
    <AppBar
      color="transparent"
      elevation={0}
      position="static"
      sx={{
        mb: 4,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: 999,
        backgroundColor: 'background.paper'
      }}
    >
      <Toolbar sx={{ minHeight: 72, px: { xs: 1.5, sm: 2.5 }, justifyContent: 'space-between' }}>
        <Stack alignItems="center" direction="row" spacing={1.5}>
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              backgroundColor: 'primary.main',
              boxShadow: (theme) => `0 0 0 6px ${theme.palette.action.hover}, 0 0 28px ${theme.palette.primary.main}`
            }}
          />
          <Typography variant="h6">RAA Assistant</Typography>
        </Stack>

        <Stack alignItems="center" direction="row" spacing={1}>
          <Button component={Link} href="/digest" variant="text">
            Digest
          </Button>
          <Button component={Link} href="/inbox" variant="text">
            Inbox
          </Button>
          <Button component={Link} href="/auth/logout" variant="text">
            Logout
          </Button>
          <IconButton
            aria-label="Toggle color mode"
            color="primary"
            onClick={() => dispatch(appActions.toggleThemeMode())}
          >
            {isDarkMode ? <LightModeRounded /> : <DarkModeRounded />}
          </IconButton>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
