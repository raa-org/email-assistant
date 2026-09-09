/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client'

import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import { Box, Button, CircularProgress, Divider, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { inboxActions } from '../../state/inbox/actions'
import {
  selectMessageDetail,
  selectMessageDetailLoading,
  selectMessageSummary,
  selectSelectedUid,
  selectSummaryLoading
} from '../../state/inbox/selectors'
import { useAppDispatch, useAppSelector } from '../../state/hooks'
import { parseSender, formatTimeLabel } from './format-helpers'

function autoLinkUrls(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return escaped.replace(
    /https?:\/\/[^\s<>"')\]]+/g,
    (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  )
}

const Panel = styled(Box)(({ theme }) => ({
  backgroundColor: theme.appTokens.dashboard.surface,
  border: `1px solid ${theme.appTokens.dashboard.border}`,
  borderRadius: 12,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  // Fill the grid row height — parent InboxLayout constrains to viewport.
  height: '100%',
  minHeight: 0
}))

const PanelHeader = styled(Stack)(({ theme }) => ({
  flexShrink: 0,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 3),
  borderBottom: `1px solid ${theme.appTokens.dashboard.border}`
}))

const PanelScrollArea = styled(Box)({
  overflowY: 'auto',
  flex: 1,
  minHeight: 0
})

const PanelBody = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2.5, 3),
}))

const Subject = styled(Typography)(({ theme }) => ({
  fontSize: 16,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  color: theme.appTokens.dashboard.textPrimary
}))

const Meta = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  color: theme.appTokens.dashboard.textSecondary
}))

const BodyText = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  lineHeight: 1.7,
  color: theme.appTokens.dashboard.textPrimary,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  '& a': {
    color: theme.appTokens.dashboard.blue,
    textDecoration: 'underline',
    '&:hover': { opacity: 0.8 }
  }
}))


const SummarySection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  borderTop: `1px solid ${theme.appTokens.dashboard.border}`,
  backgroundColor: theme.appTokens.dashboard.surfaceMuted
}))

const SummaryTitle = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '-0.005em',
  color: theme.appTokens.dashboard.orange,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75)
}))

const SummaryText = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  lineHeight: 1.6,
  color: theme.appTokens.dashboard.textPrimary,
  marginTop: theme.spacing(1)
}))

const CategoryChip = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  fontSize: 11,
  fontWeight: 500,
  padding: theme.spacing(0.25, 1),
  borderRadius: 999,
  border: `1px solid ${theme.appTokens.dashboard.border}`,
  color: theme.appTokens.dashboard.textSecondary
}))

export function MessagePanel() {
  const dispatch = useAppDispatch()
  const selectedUid = useAppSelector(selectSelectedUid)
  const detail = useAppSelector(selectMessageDetail)
  const detailLoading = useAppSelector(selectMessageDetailLoading)
  const summary = useAppSelector(selectMessageSummary)
  const summaryLoading = useAppSelector(selectSummaryLoading)

  if (!selectedUid) return null

  const sender = detail ? parseSender(detail.from) : null

  return (
    <Panel>
      <PanelHeader>
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Message Detail</Typography>
        <IconButton size="small" onClick={() => dispatch(inboxActions.closeMessage())}>
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </PanelHeader>

      <PanelScrollArea>
        <PanelBody>
          {detailLoading ? (
            <Stack gap={1.5}>
              <Skeleton variant="text" width="75%" height={22} />
              <Skeleton variant="text" width="55%" height={16} />
              <Skeleton variant="text" width="40%" height={16} />
              <Box sx={{ mt: 1 }} />
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="95%" />
              <Skeleton variant="text" width="90%" />
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="85%" />
              <Skeleton variant="text" width="70%" />
              <Box sx={{ mt: 0.5 }} />
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="92%" />
              <Skeleton variant="text" width="60%" />
            </Stack>
          ) : detail ? (
            <Stack gap={1.5}>
              <Subject>{detail.subject}</Subject>
              <Stack gap={0.25}>
                <Meta>{sender?.name} &lt;{sender?.email}&gt;</Meta>
                <Meta>{formatTimeLabel(detail.receivedAt)}</Meta>
              </Stack>
              <Divider />
              <BodyText dangerouslySetInnerHTML={{ __html: autoLinkUrls(detail.bodyText) }} />
            </Stack>
          ) : (
            <Meta>Message could not be loaded.</Meta>
          )}
        </PanelBody>

        <SummarySection>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <SummaryTitle>
            <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />
            AI Summary
          </SummaryTitle>
          {summary && !summaryLoading && (
            <Tooltip title="Re-summarize" arrow>
              <IconButton
                size="small"
                onClick={() => {
                  if (selectedUid) {
                    dispatch(inboxActions.requestResummarize({ uid: selectedUid, folder: detail?.folder ?? 'INBOX' }))
                  }
                }}
              >
                <RefreshRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {summaryLoading ? (
          <Stack gap={1} mt={1.5} alignItems="center">
            <CircularProgress size={20} sx={(theme) => ({ color: theme.appTokens.dashboard.orange })} />
            <Meta>Generating summary...</Meta>
          </Stack>
        ) : summary ? (
          <Stack gap={1} mt={1}>
            <SummaryText>{summary.summary}</SummaryText>
            {summary.actionItems.length > 0 && (
              <Box>
                <Meta sx={{ fontWeight: 600, mb: 0.5 }}>Action Items:</Meta>
                {summary.actionItems.map((item, i) => (
                  <SummaryText key={i}>• {item}</SummaryText>
                ))}
              </Box>
            )}
            {summary.categories.length > 0 && (
              <Stack direction="row" gap={0.5} flexWrap="wrap" mt={0.5}>
                {summary.categories.map((cat) => (
                  <CategoryChip key={cat}>{cat}</CategoryChip>
                ))}
              </Stack>
            )}
          </Stack>
        ) : (
          <SummaryText>Summary unavailable.</SummaryText>
        )}
      </SummarySection>
      </PanelScrollArea>
    </Panel>
  )
}
