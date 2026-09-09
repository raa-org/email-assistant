/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { inboxActions } from '../../state/inbox/actions';
import { useAppDispatch, useAppSelector } from '../../state/hooks';
import { mailActions } from '../../state/mail/actions';
import { selectMessageByUid } from '../../state/mail/selectors';
import { MainNav } from '../navigation/main-nav';

export function MessageDetailView({ uid }: Readonly<{ uid: string }>) {
  const dispatch = useAppDispatch();
  const message = useAppSelector(selectMessageByUid(uid));

  // Mark the message as read in IMAP when the user opens the detail view.
  // Idempotent — repeated \Seen flag adds are harmless. Backend call is
  // fire-and-forget; no loading state shown.
  useEffect(() => {
    dispatch(inboxActions.markRead({ folder: 'INBOX', uid }));
  }, [dispatch, uid]);

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
        <Typography className="eyebrow">Message Detail</Typography>
        <Typography variant="h1">Thread {uid}</Typography>
        <Typography color="text.secondary">
          This page reads from the Redux container now and is ready to switch from mock hydration to backend queries.
        </Typography>
        </Box>
      </Box>

      <Box className="grid two" component="section">
        <Card sx={{ backgroundColor: 'background.paper' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography gutterBottom variant="h5">
              Message
            </Typography>
          {message ? (
            <>
              <Typography>{message.subject}</Typography>
              <Typography color="text.secondary" mt={1}>
                {message.from}
              </Typography>
              <Typography mt={2}>{message.bodyText}</Typography>
              <Typography mt={2} variant="body2">
                {message.receivedAt}
              </Typography>
            </>
          ) : (
            <Typography>Message was not found in the current client state snapshot.</Typography>
          )}
          </CardContent>
        </Card>

        <Card sx={{ backgroundColor: 'background.paper' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography gutterBottom variant="h5">
              Summary
            </Typography>
            <Typography color="text.secondary">
              Single-message summarization should remain a backend command flow and return structured output for rendering.
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1.25} mt={3}>
              <Button onClick={() => dispatch(mailActions.selectMessage(uid))} variant="outlined">
              Pin this thread
              </Button>
              <Button component={Link} href="/inbox" variant="contained">
                Back to inbox
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
