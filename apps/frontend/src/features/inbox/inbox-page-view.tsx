/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client'

import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import type { MailMessageDto } from '@raa/assistant/common'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import KeyboardVoiceRoundedIcon from '@mui/icons-material/KeyboardVoiceRounded'
import NorthRoundedIcon from '@mui/icons-material/NorthRounded'
import { Box, CircularProgress, Fade, Stack, Switch, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { inboxActions, type InboxTab } from '../../state/inbox/actions'
import {
  selectActiveTab,
  selectFilteredMessages,
  selectFolderTotal,
  selectFolderUnread,
  selectInboxLoading,
  selectPanelOpen,
  selectSelectedUid,
  selectShowNewOnly,
  selectUnreadCount,
} from '../../state/inbox/selectors'
import { useAppDispatch, useAppSelector } from '../../state/hooks'
import { selectUserDisplayName } from '../../state/user/selectors'
import { AppShell } from '../shell/app-shell'
import { formatTimeLabel, groupMessages, parseSender } from './format-helpers'
import { MessagePanel } from './message-panel'

const filterTabs: { id: InboxTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '3days', label: '3 Days' },
  { id: '7days', label: '7 Days' },
  { id: 'custom', label: 'Custom' },
]

// ─── Layout ────────────────────────────────────────────────────────────────

const InboxLayout = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'panelOpen',
})<{ panelOpen?: boolean }>(({ theme, panelOpen }) => ({
  display: 'grid',
  gridTemplateColumns: panelOpen ? 'minmax(0, 1fr) 420px' : '1fr',
  gap: theme.spacing(3),
  padding: theme.spacing(3),
  paddingBottom: theme.spacing(1),
  // Fill viewport below header. Subtract headerHeight + MainContent
  // paddingBottom. Own padding is inside the box (border-box).
  height: `calc(100vh - ${theme.appTokens.layout.headerHeight}px - ${theme.spacing(4)})`,
  overflow: 'hidden',
  transition: 'grid-template-columns 0.3s ease',
  [theme.breakpoints.down('lg')]: {
    gridTemplateColumns: '1fr',
  },
}))

// ─── Left panel ────────────────────────────────────────────────────────────

const EmailListPanel = styled(Box)(({ theme }) => ({
  backgroundColor: theme.appTokens.dashboard.surface,
  border: `1px solid ${theme.appTokens.dashboard.border}`,
  borderRadius: 12,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  // Fill the grid row so internal scroll works correctly.
  height: '100%',
}))

const PanelHeader = styled(Box)(({ theme }) => ({
  flexShrink: 0,
  paddingInline: theme.spacing(3),
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(0),
}))

const EyebrowLabel = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: '-0.01em',
  color: theme.appTokens.dashboard.textSecondary,
  marginBottom: theme.spacing(0.5),
}))

const TitleRow = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
}))

const PanelTitle = styled(Typography)(({ theme }) => ({
  fontSize: 18,
  fontWeight: 600,
  letterSpacing: '-0.03em',
  lineHeight: 1.2,
  color: theme.appTokens.dashboard.textPrimary,
}))

const NewBadge = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  paddingInline: theme.spacing(1),
  paddingBlock: theme.spacing(0.25),
  borderRadius: 16,
  backgroundColor: theme.appTokens.dashboard.meeting.confirmed.bg,
  border: `1px solid ${theme.appTokens.dashboard.meeting.confirmed.border}`,
  flexShrink: 0,
}))

const NewBadgeText = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 500,
  color: theme.appTokens.dashboard.meeting.confirmed.text,
  lineHeight: '18px',
  whiteSpace: 'nowrap',
}))

// ─── Segmented tab control ────────────────────────────────────────────────

const TabsRow = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: theme.spacing(1.5),
}))

const FilterTabButton = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ theme, active = false }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 56,
  paddingInline: theme.spacing(1.5),
  paddingBlock: theme.spacing(1),
  fontSize: 12,
  fontWeight: active ? 600 : 500,
  cursor: 'pointer',
  position: 'relative',
  marginLeft: '-1px',
  zIndex: active ? 1 : 0,
  textAlign: 'center' as const,
  userSelect: 'none' as const,
  transition: 'background-color 0.15s ease, color 0.15s ease',
  color: active ? theme.appTokens.dashboard.canvas : theme.appTokens.dashboard.textSecondary,
  backgroundColor: active ? theme.appTokens.dashboard.textPrimary : theme.appTokens.dashboard.surface,
  border: `1px solid ${active ? theme.appTokens.dashboard.textPrimary : theme.appTokens.dashboard.borderStrong}`,
  '&:first-of-type': {
    marginLeft: 0,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  '&:last-of-type': {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
}))

// ─── Stats bar ─────────────────────────────────────────────────────────────

const StatsBar = styled(Stack)(({ theme }) => ({
  flexShrink: 0,
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(2.5),
  paddingInline: theme.spacing(3),
  paddingBlock: theme.spacing(1.5),
  borderBottom: `1px solid ${theme.appTokens.dashboard.border}`,
  flexWrap: 'nowrap',
  overflowX: 'auto',
}))

const StatItem = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  flexShrink: 0,
  whiteSpace: 'nowrap',
}))

const StatValue = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'statColor',
})<{ statColor: 'blue' | 'orange' | 'green' | 'amber' }>(({ theme, statColor }) => ({
  fontSize: 16,
  fontWeight: 600,
  letterSpacing: '-0.007em',
  color: theme.appTokens.dashboard[statColor],
}))

const StatLabel = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 400,
  color: theme.appTokens.dashboard.textPrimary,
}))

const ShowNewLabel = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 500,
  color: theme.appTokens.dashboard.textSecondary,
  whiteSpace: 'nowrap',
}))

// ─── Email groups ──────────────────────────────────────────────────────────

const GroupsArea = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  paddingInline: theme.spacing(3),
  paddingBlock: theme.spacing(2),
  // Only this section scrolls — header and stats stay pinned above.
  overflowY: 'auto',
  flex: 1,
  minHeight: 0,
}))

const PriorityLabel = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  color: theme.appTokens.dashboard.orange,
  marginBottom: theme.spacing(1),
}))

const PriorityCards = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.appTokens.dashboard.action.warning.border}`,
  borderRadius: 8,
  overflow: 'hidden',
}))

const GroupLabel = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: '-0.005em',
  color: theme.appTokens.dashboard.textTertiary,
  marginBottom: theme.spacing(1),
  display: 'block',
}))

const CardsList = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
}))

// ─── Email row ─────────────────────────────────────────────────────────────

const EmailRowShell = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isPriority',
})<{ isPriority?: boolean }>(({ theme, isPriority }) => ({
  padding: theme.spacing(2),
  cursor: 'pointer',
  transition: 'background-color 0.12s ease, border-radius 0.12s ease',
  backgroundColor: isPriority ? theme.appTokens.dashboard.action.warning.bg : 'transparent',
  backgroundImage: `linear-gradient(to right, transparent 0, ${theme.appTokens.dashboard.border} ${theme.spacing(8)}, ${theme.appTokens.dashboard.border} calc(100% - ${theme.spacing(8)}), transparent 100%)`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'bottom',
  backgroundSize: '100% 1px',
  '&:hover': {
    backgroundColor: theme.appTokens.dashboard.surfaceMuted,
    ...(!isPriority && { borderRadius: theme.spacing(2) }),
  },
  '&:last-child': {
    backgroundImage: 'none',
  },
}))

const EmailRowTop = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'baseline',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(0.75),
}))

const SenderName = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: '-0.007em',
  color: theme.appTokens.dashboard.textPrimary,
  whiteSpace: 'nowrap',
  flexShrink: 0,
}))

const SenderEmail = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  color: theme.appTokens.dashboard.textTertiary,
  letterSpacing: '-0.005em',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
}))

const TimeLabel = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  color: theme.appTokens.dashboard.textSecondary,
  whiteSpace: 'nowrap',
  marginLeft: 'auto',
  flexShrink: 0,
}))

const EmailRowMiddle = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(0.75),
  minWidth: 0,
}))

const NewDot = styled(Box)(({ theme }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: theme.appTokens.dashboard.green,
  flexShrink: 0,
}))

const SubjectText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isNew',
})<{ isNew?: boolean }>(({ theme, isNew }) => ({
  fontSize: 16,
  fontWeight: isNew ? 700 : 600,
  letterSpacing: '-0.007em',
  color: theme.appTokens.dashboard.textPrimary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
}))

const MessageCount = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(0.25),
  marginLeft: 'auto',
  flexShrink: 0,
}))

const MessageCountText = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.appTokens.dashboard.textPrimary,
  letterSpacing: '-0.005em',
}))

const EmailRowBottom = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: theme.spacing(0.75),
}))

const AiSummaryText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isNew',
})<{ isNew?: boolean }>(({ theme, isNew }) => ({
  fontSize: 14,
  lineHeight: 1.5,
  fontWeight: isNew ? 500 : 400,
  color: isNew ? theme.appTokens.dashboard.textPrimary : theme.appTokens.dashboard.textSecondary,
  letterSpacing: '-0.005em',
}))

// ─── AI Assistant panel ────────────────────────────────────────────────────

const AiPanel = styled(Box)(({ theme }) => ({
  backgroundColor: theme.appTokens.dashboard.surface,
  border: `1px solid ${theme.appTokens.dashboard.border}`,
  borderRadius: 12,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 3),
  minHeight: 480,
}))

const AiPanelHeader = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  borderBottom: `1px solid ${theme.appTokens.dashboard.border}`,
}))

const AiIconMark = styled(Box)(({ theme }) => ({
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
  background: 'linear-gradient(180deg, #2af598 0%, #009efd 100%)',
  color: '#ffffff',
  flexShrink: 0,
}))

const AiPanelTitle = styled(Typography)(({ theme }) => ({
  fontSize: 18,
  fontWeight: 600,
  letterSpacing: '-0.03em',
  color: theme.appTokens.dashboard.textPrimary,
}))

const AiBottomSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}))

const BotMessage = styled(Stack)({
  flexDirection: 'row',
  alignItems: 'flex-start',
})

const BotAvatarShell = styled(Box)({
  width: 40,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
})

const BotMessageBubble = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  backgroundColor: theme.appTokens.dashboard.surface,
  border: `1px solid ${theme.appTokens.dashboard.border}`,
  borderRadius: 16,
  padding: theme.spacing(1.5),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: theme.spacing(0.5),
}))

const BotMessageText = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1.2,
  letterSpacing: '-0.006em',
  color: theme.appTokens.dashboard.textPrimary,
  width: '100%',
}))

const BotMessageTime = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 500,
  lineHeight: '16px',
  color: theme.appTokens.dashboard.textSecondary,
}))

const ChipsArea = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5),
  paddingTop: theme.spacing(2),
  borderTop: `1px solid ${theme.appTokens.dashboard.border}`,
}))

const QuickChip = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  paddingInline: theme.spacing(1),
  paddingBlock: theme.spacing(0.25),
  borderRadius: 6,
  border: `1px solid ${theme.appTokens.dashboard.borderStrong}`,
  fontSize: 12,
  fontWeight: 500,
  lineHeight: '18px',
  color: theme.appTokens.dashboard.action.warning.text,
  backgroundColor: theme.appTokens.dashboard.surface,
  cursor: 'pointer',
  transition: 'background-color 0.12s ease',
  '&:hover': {
    backgroundColor: theme.appTokens.dashboard.surfaceMuted,
  },
}))

const AiInputArea = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(1),
  paddingBlock: theme.spacing(0.75),
  borderRadius: 999,
  border: `1px solid ${theme.appTokens.dashboard.borderStrong}`,
  backgroundColor: theme.appTokens.dashboard.surface,
}))

const AiInputText = styled(Typography)(({ theme }) => ({
  flex: 1,
  fontSize: 16,
  fontWeight: 500,
  lineHeight: '22px',
  letterSpacing: '-0.007em',
  color: theme.palette.mode === 'dark' ? 'rgba(243, 248, 251, 0.45)' : 'rgba(24, 26, 32, 0.6)',
}))

const MicButton = styled(Box)(({ theme }) => ({
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  color: theme.appTokens.dashboard.textSecondary,
  cursor: 'pointer',
  flexShrink: 0,
  transition: 'background-color 0.12s ease',
  '&:hover': {
    backgroundColor: theme.appTokens.dashboard.surfaceMuted,
  },
}))

const SendButton = styled(Box)(({ theme }) => ({
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  backgroundColor: theme.appTokens.dashboard.green,
  color: '#ffffff',
  cursor: 'pointer',
  flexShrink: 0,
  transition: 'opacity 0.15s ease',
  '&:hover': {
    opacity: 0.88,
  },
}))

// ─── Sub-components ────────────────────────────────────────────────────────

function EmailRow({ message, isSelected }: { message: MailMessageDto; isSelected?: boolean }) {
  const dispatch = useAppDispatch()
  const sender = parseSender(message.from)

  return (
    <EmailRowShell
      onClick={() => dispatch(inboxActions.selectMessage({ uid: message.uid, folder: message.folder }))}
      sx={isSelected ? (theme: any) => ({ backgroundColor: theme.appTokens.dashboard.surfaceMuted, borderRadius: theme.spacing(2) }) : undefined}
    >
      <EmailRowTop>
        <SenderName>{sender.name}</SenderName>
        <SenderEmail>{sender.email}</SenderEmail>
        <TimeLabel>{formatTimeLabel(message.receivedAt)}</TimeLabel>
      </EmailRowTop>

      <EmailRowMiddle>
        {message.isUnread && <NewDot />}
        <SubjectText isNew={message.isUnread}>{message.subject}</SubjectText>
      </EmailRowMiddle>

      <EmailRowBottom>
        <AutoAwesomeRoundedIcon
          sx={(theme) => ({
            fontSize: 16,
            color: theme.appTokens.dashboard.orange,
            flexShrink: 0,
            mt: '2px',
          })}
        />
        <AiSummaryText isNew={message.isUnread}>{message.preview}</AiSummaryText>
      </EmailRowBottom>
    </EmailRowShell>
  )
}

function MessageGroup({
  label,
  messages,
  selectedUid,
}: {
  label: string
  messages: MailMessageDto[]
  selectedUid: string | null
}) {
  if (messages.length === 0) return null

  return (
    <Box>
      <GroupLabel>{label}</GroupLabel>
      <CardsList>
        {messages.map((msg) => (
          <EmailRow key={msg.uid} message={msg} isSelected={msg.uid === selectedUid} />
        ))}
      </CardsList>
    </Box>
  )
}

// ─── Page view ─────────────────────────────────────────────────────────────

export function InboxPageView() {
  const dispatch = useAppDispatch()
  const displayName = useAppSelector(selectUserDisplayName)
  const activeTab = useAppSelector(selectActiveTab)
  const showNewOnly = useAppSelector(selectShowNewOnly)
  const messages = useAppSelector(selectFilteredMessages)
  const unreadCount = useAppSelector(selectUnreadCount)
  const folderTotal = useAppSelector(selectFolderTotal)
  const folderUnread = useAppSelector(selectFolderUnread)
  const panelOpen = useAppSelector(selectPanelOpen)
  const selectedUid = useAppSelector(selectSelectedUid)
  const loading = useAppSelector(selectInboxLoading)
  const searchParams = useSearchParams()

  // Read URL params on mount and apply filters from digest navigation.
  const urlUids = searchParams.get('uids')
  const uidFilter = useMemo(
    () => (urlUids ? new Set(urlUids.split(',')) : null),
    [urlUids]
  )

  useEffect(() => {
    const urlSearch = searchParams.get('search')
    const urlShowNew = searchParams.get('showNew')

    if (urlSearch) {
      dispatch(inboxActions.setSearchQuery(urlSearch))
    }
    if (urlShowNew === 'true') {
      dispatch(inboxActions.setShowNewOnly(true))
    }
    dispatch(inboxActions.requestMessages({ folder: 'INBOX', tab: 'all' }))
  }, [dispatch, searchParams])

  const displayMessages = uidFilter
    ? messages.filter((m) => uidFilter.has(m.uid))
    : messages
  const grouped = groupMessages(displayMessages)

  return (
    <AppShell activePage="inbox">
      <InboxLayout panelOpen={panelOpen}>
        {/* Left: email list */}
        <EmailListPanel>
          <PanelHeader>
            <EyebrowLabel>Your Email Overview</EyebrowLabel>
            {displayName && (
              <Fade in timeout={240} appear>
                <TitleRow>
                  <PanelTitle>{`Hi ${displayName}, Here's Your Email Summary!`}</PanelTitle>
                  {unreadCount > 0 && (
                    <NewBadge>
                      <NewBadgeText>{unreadCount} new</NewBadgeText>
                    </NewBadge>
                  )}
                </TitleRow>
              </Fade>
            )}
            <TabsRow>
              {filterTabs.map((tab) => (
                <FilterTabButton
                  key={tab.id}
                  active={activeTab === tab.id}
                  onClick={() => dispatch(inboxActions.setActiveTab(tab.id))}
                >
                  {tab.label}
                </FilterTabButton>
              ))}
            </TabsRow>
          </PanelHeader>

          <StatsBar>
            <StatItem>
              <StatValue statColor="blue">{folderTotal.toLocaleString()}</StatValue>
              <StatLabel>Total</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue statColor="green">{folderUnread.toLocaleString()}</StatValue>
              <StatLabel>Unread</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue statColor="orange">{displayMessages.length}</StatValue>
              <StatLabel>{uidFilter ? 'Filtered' : 'Loaded'}</StatLabel>
            </StatItem>
            {loading && (
              <CircularProgress size={14} sx={(theme) => ({ color: theme.appTokens.dashboard.green, flexShrink: 0 })} />
            )}
            <Stack direction="row" alignItems="center" gap={0.75} flexShrink={0} ml="auto">
              <ShowNewLabel>Show new only</ShowNewLabel>
              <Switch
                checked={showNewOnly}
                onChange={(e) => dispatch(inboxActions.setShowNewOnly(e.target.checked))}
                size="small"
                inputProps={{ suppressHydrationWarning: true }}
              />
            </Stack>
          </StatsBar>

          <GroupsArea>
            {messages.length === 0 && !loading ? (
              <Box px={3} py={4}>
                <Typography sx={(theme) => ({ color: theme.appTokens.dashboard.textSecondary, fontSize: 14 })}>
                  No messages for the selected period.
                </Typography>
              </Box>
            ) : (
              <>
                <MessageGroup label="Today" messages={grouped.today} selectedUid={selectedUid} />
                <MessageGroup label="Yesterday" messages={grouped.yesterday} selectedUid={selectedUid} />
                <MessageGroup label="Older" messages={grouped.older} selectedUid={selectedUid} />
              </>
            )}
          </GroupsArea>
        </EmailListPanel>

        {panelOpen && (
          <Fade in timeout={200} appear>
            <Box sx={{ height: '100%', minHeight: 0 }}>
              <MessagePanel />
            </Box>
          </Fade>
        )}

        {/* AI assistant panel — hidden until agent module is implemented
        <AiPanel>
          <AiPanelHeader>
            <AiIconMark>
              <AutoAwesomeRoundedIcon sx={{ fontSize: 14 }} />
            </AiIconMark>
            <AiPanelTitle>AI Assistant</AiPanelTitle>
          </AiPanelHeader>

          <AiBottomSection>
            <BotMessage>
              <BotAvatarShell>
                <AutoAwesomeRoundedIcon sx={(theme) => ({ fontSize: 20, color: theme.appTokens.dashboard.orange })} />
              </BotAvatarShell>
              <BotMessageBubble>
                <BotMessageText>
                  Hi! I&apos;m your AI assistant. I can help you summarize emails, draft replies, and manage your
                  schedule. What would you like help with?
                </BotMessageText>
                <BotMessageTime>02:25</BotMessageTime>
              </BotMessageBubble>
            </BotMessage>

            <ChipsArea>
              <QuickChip>Summarize my unread emails</QuickChip>
              <QuickChip>Find emails about invoices</QuickChip>
              <QuickChip>What needs my attention?</QuickChip>
            </ChipsArea>

            <AiInputArea>
              <AiInputText>Ask something...</AiInputText>
              <MicButton>
                <KeyboardVoiceRoundedIcon sx={{ fontSize: 18 }} />
              </MicButton>
              <SendButton>
                <NorthRoundedIcon sx={{ fontSize: 16 }} />
              </SendButton>
            </AiInputArea>
          </AiBottomSection>
        </AiPanel>
        */}
      </InboxLayout>
    </AppShell>
  )
}
