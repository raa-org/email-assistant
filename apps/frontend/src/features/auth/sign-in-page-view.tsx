/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client';

import Link from 'next/link';
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { MainNav } from '../navigation/main-nav';

export function SignInPageView() {
  return (
    <Box className="page-shell" component="main">
      <MainNav />

      <Box className="hero">
        <Box
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            borderRadius: '28px',
            border: (theme) => `1px solid ${theme.palette.divider}`,
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(145deg, rgba(28, 38, 45, 0.88), rgba(16, 22, 26, 0.96))'
                : 'linear-gradient(145deg, rgba(255, 248, 238, 0.92), rgba(242, 250, 247, 0.9))',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 24px 64px rgba(0, 0, 0, 0.38)'
                : '0 24px 64px rgba(73, 52, 21, 0.12)'
          }}
        >
        <Typography className="eyebrow">Keycloak SSO</Typography>
        <Typography variant="h1">Corporate sign-in only.</Typography>
        <Typography color="text.secondary">
          Authentication is delegated to the existing Keycloak realm. No local credentials are stored by the assistant.
        </Typography>
        </Box>
      </Box>

      <Card sx={{ mt: 3, backgroundColor: 'background.paper' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" flexWrap="wrap" gap={1.25}>
            <Chip color="primary" label="OIDC via Keycloak" variant="filled" />
            <Chip label="No IMAP passwords" variant="outlined" />
            <Chip label="Internal-only access" variant="outlined" />
          </Stack>
          <Stack direction="row" mt={3}>
            <Button
              color="primary"
              component={Link}
              href="/digest"
              size="large"
              sx={{ px: 3, py: 1.25 }}
              variant="contained"
            >
              Continue to digest
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
