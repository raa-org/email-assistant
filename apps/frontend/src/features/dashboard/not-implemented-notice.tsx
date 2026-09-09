/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client';

import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import { Stack, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const Notice = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1.5, 2),
  borderRadius: 8,
  backgroundColor: theme.appTokens.dashboard.summaryGlyphs.warning,
  border: `1px dashed ${theme.appTokens.dashboard.action.warning.border}`
}));

const NoticeText = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  color: theme.appTokens.dashboard.textSecondary
}));

interface NotImplementedNoticeProps {
  message: string;
}

// Visual marker for sections that depend on integrations not yet implemented
// (calendar, AI assistant). Keeps the existing styled card around so the
// layout stays stable; replaces hardcoded sample data with a clear "coming
// later" hint instead of pretending the data is real.
export function NotImplementedNotice({ message }: NotImplementedNoticeProps) {
  return (
    <Notice>
      <ConstructionRoundedIcon
        sx={(theme) => ({ fontSize: 18, color: theme.appTokens.dashboard.orange, flexShrink: 0 })}
      />
      <NoticeText>{message}</NoticeText>
    </Notice>
  );
}
