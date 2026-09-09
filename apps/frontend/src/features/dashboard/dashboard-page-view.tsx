/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { SentReceivedDayDto, SummaryPeriodKind } from '@raa/assistant/common'
import { DayPicker, type DateRange as DayPickerRange } from 'react-day-picker'
import 'react-day-picker/style.css'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import GppMaybeRoundedIcon from '@mui/icons-material/GppMaybeRounded'
import MailRoundedIcon from '@mui/icons-material/MailRounded'
import GroupRoundedIcon from '@mui/icons-material/GroupRounded'
import FiberNewRoundedIcon from '@mui/icons-material/FiberNewRounded'
import PriorityHighRoundedIcon from '@mui/icons-material/PriorityHighRounded'
import ReportGmailerrorredRoundedIcon from '@mui/icons-material/ReportGmailerrorredRounded'
import MoveToInboxRoundedIcon from '@mui/icons-material/MoveToInboxRounded'
import SyncRoundedIcon from '@mui/icons-material/SyncRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import {
  Box,
  Card,
  Fade,
  IconButton,
  LinearProgress,
  Popover,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import Link from 'next/link'
import EditCalendarOutlinedIcon from '@mui/icons-material/EditCalendarOutlined'
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { keyframes, styled } from '@mui/material/styles'
import { briefingActions } from '../../state/briefing/actions'
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import {
  selectAgendaItems,
  selectAgendaStreaming,
  selectSummaryAccumulated,
  selectSummaryResult,
  selectSummaryStreaming,
} from '../../state/briefing/selectors'
import { enrichmentActions } from '../../state/enrichment/actions'
import {
  selectEnrichmentError,
  selectEnrichmentErrors,
  selectEnrichmentProgress,
  selectEnrichmentReady,
  selectEnrichmentStreaming,
} from '../../state/enrichment/selectors'
import { digestActions } from '../../state/digest/actions'
import {
  selectDigestBlock,
  selectDigestStreaming,
  selectDigestTotalProcessed,
  selectSentReceivedSeries,
  selectTopContacts,
} from '../../state/digest/selectors'
import { inboxActions } from '../../state/inbox/actions'
import { useAppDispatch, useAppSelector } from '../../state/hooks'
import { selectUserDisplayName } from '../../state/user/selectors'
import { AppShell } from '../shell/app-shell'
import { busiestDayLabel, deriveMetrics, deriveSummaryItems, type DerivedSummaryTone } from './derive-summary'
import { NotImplementedNotice } from './not-implemented-notice'
import {
  ChartSkeleton,
  ContactsSkeleton,
  MetricsSkeleton,
  SectionSkeleton,
  SummaryGridSkeleton,
} from './section-skeleton'

type SummaryTone = DerivedSummaryTone
type MeetingStatus = 'confirmed' | 'conflict' | 'pending'

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

function RefreshButton({ onRefresh }: { onRefresh: (force: boolean) => void }) {
  const [modifierHeld, setModifierHeld] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => setModifierHeld(e.metaKey || e.ctrlKey)
    const onBlur = () => setModifierHeld(false)

    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  return (
    <Tooltip title={modifierHeld ? 'Hard refresh' : 'Soft refresh'} arrow>
      <IconButton
        size="small"
        onClick={(e) => onRefresh(e.metaKey || e.ctrlKey)}
        sx={(theme) => ({ color: theme.appTokens.dashboard.textSecondary })}
      >
        <SyncRoundedIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Tooltip>
  )
}

type BriefingFilter = SummaryPeriodKind

const BRIEFING_TABS: { id: BriefingFilter; label: string }[] = [
  { id: 'unread', label: 'All Unread' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'custom', label: 'Custom' },
]

const GREETING_SUFFIX: Record<BriefingFilter, string> = {
  unread: 'new updates',
  today: 'summary for today',
  yesterday: 'summary for yesterday',
  week: 'summary for this week',
  month: 'summary for this month',
  custom: 'summary for selected period',
}

// ActionVariant kept for the styled smart-action components; the card itself
// is now stubbed out via NotImplementedNotice until calendar/AI integration
// arrives in a later phase.
type ActionVariant = 'warning' | 'neutral' | 'error'

const SUMMARY_TONE_ICONS: Record<SummaryTone, ReactNode> = {
  info: <MailRoundedIcon fontSize="small" />,
  warning: <WarningAmberRoundedIcon fontSize="small" />,
  success: <CheckCircleRoundedIcon fontSize="small" />,
  danger: <ErrorOutlineRoundedIcon fontSize="small" />,
  accent: <CalendarTodayRoundedIcon fontSize="small" />,
}

const SUMMARY_BLOCK_ICONS: Record<string, ReactNode> = {
  critical: <ErrorOutlineRoundedIcon fontSize="small" />,
  suspicious: <GppMaybeRoundedIcon fontSize="small" />,
  severalEmails: <GroupRoundedIcon fontSize="small" />,
  newEmails: <FiberNewRoundedIcon fontSize="small" />,
  importantEmails: <PriorityHighRoundedIcon fontSize="small" />,
  junkMessages: <ReportGmailerrorredRoundedIcon fontSize="small" />,
}

function summaryItemIcon(item: { id: string; tone: SummaryTone }): ReactNode {
  return SUMMARY_BLOCK_ICONS[item.id] ?? SUMMARY_TONE_ICONS[item.tone]
}

const ContentShell = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  paddingInline: theme.spacing(3),
  paddingTop: theme.spacing(3),
  paddingBottom: 0,
  overflow: 'hidden',
  boxSizing: 'border-box',
  [theme.breakpoints.down('md')]: {
    paddingInline: theme.spacing(2),
    paddingTop: theme.spacing(2),
  },
}))

const ContentGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(3),
  gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)',
  alignItems: 'stretch',
  flex: 1,
  minHeight: 0,
  [theme.breakpoints.down('lg')]: {
    gridTemplateColumns: '1fr',
  },
}))

const BottomGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(3),
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  flexShrink: 0,
  height: 320,
  marginTop: theme.spacing(3),
  [theme.breakpoints.down('lg')]: {
    gridTemplateColumns: '1fr',
    height: 'auto',
  },
}))

const SurfaceCard = styled(Card)(({ theme }) => ({
  paddingInline: theme.spacing(3),
  paddingBlock: theme.spacing(2),
  borderRadius: 12,
  backgroundColor: theme.appTokens.dashboard.surface,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
}))

const CardSection = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(2),
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  marginRight: theme.spacing(-3),
  paddingRight: theme.spacing(3),
  // maskImage: 'linear-gradient(to bottom, transparent 0%, black 2px, black calc(100% - 2px), transparent 100%)',
  // WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 2px, black calc(100% - 2px), transparent 100%)',
}))

const SectionEyebrow = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1.2,
  letterSpacing: '-0.03em',
  color: theme.appTokens.dashboard.textSecondary,
}))

const AnimatedEyebrow = styled(SectionEyebrow)`
  @keyframes briefingFadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  animation: briefingFadeIn 0.6s ease-out both;
`

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: 18,
  fontWeight: 600,
  lineHeight: 1.2,
  letterSpacing: '-0.03em',
  color: theme.appTokens.dashboard.textPrimary,
}))

const MetricsBar = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1.5),
  paddingBottom: theme.spacing(1.5),
  borderBottom: `1px solid ${theme.appTokens.dashboard.border}`,
  overflowX: 'auto',
}))

const MetricStack = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  whiteSpace: 'nowrap',
}))

const MetricValue = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'metricColor',
})<{ metricColor: 'blue' | 'orange' | 'green' | 'amber' }>(({ theme, metricColor }) => ({
  fontSize: 16,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  color: theme.appTokens.dashboard[metricColor],
}))

const MetricLabel = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  color: theme.appTokens.dashboard.textPrimary,
}))

const SummaryGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(2),
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1fr',
  },
}))

const SummaryItemStack = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: theme.spacing(1.5),
  minWidth: 0,
}))

const SummaryGlyph = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'tone',
})<{ tone: SummaryTone }>(({ theme, tone }) => {
  const tokenMap = {
    info: theme.appTokens.dashboard.summaryGlyphs.info,
    warning: theme.appTokens.dashboard.summaryGlyphs.warning,
    success: theme.appTokens.dashboard.summaryGlyphs.success,
    danger: theme.appTokens.dashboard.summaryGlyphs.danger,
    accent: theme.appTokens.dashboard.summaryGlyphs.accent,
  }

  const colorMap = {
    info: theme.appTokens.dashboard.blue,
    warning: theme.appTokens.dashboard.orange,
    success: theme.appTokens.dashboard.green,
    danger: theme.appTokens.dashboard.red,
    accent: theme.appTokens.dashboard.purple,
  }

  return {
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    flexShrink: 0,
    color: colorMap[tone],
    backgroundColor: tokenMap[tone],
  }
})

const SummaryTextStack = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(1),
  minWidth: 0,
}))

const SummaryText = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1.5,
  letterSpacing: '-0.007em',
  color: theme.appTokens.dashboard.textPrimary,
}))

const InlineHighlight = styled('span')(({ theme }) => ({
  color: theme.appTokens.dashboard.pink,
}))

const InlineTextLink = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  lineHeight: 1.5,
  color: theme.appTokens.dashboard.textSecondary,
  cursor: 'pointer',
}))

const CenterLink = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1.2,
  letterSpacing: '-0.007em',
  color: theme.appTokens.dashboard.textSecondary,
  textAlign: 'center',
  cursor: 'pointer',
}))

const ImportantMailRow = styled(Box)(({ theme }) => ({
  paddingInline: theme.spacing(2),
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1.5),
  borderBottom: `1px solid ${theme.appTokens.dashboard.border}`,
}))

const ImportantMailTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.2,
  letterSpacing: '-0.007em',
}))

const ImportantMailSummary = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  lineHeight: 1.5,
  letterSpacing: '-0.006em',
  color: theme.appTokens.dashboard.textSecondary,
}))

const ActionGroup = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: theme.spacing(0.75),
}))

const ActionPill = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'variant',
})<{ variant: ActionVariant }>(({ theme, variant }) => {
  const token = theme.appTokens.dashboard.action[variant]

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    paddingInline: theme.spacing(1),
    paddingBlock: theme.spacing(0.375),
    borderRadius: 6,
    border: `1px solid ${token.border}`,
    backgroundColor: token.bg,
  }
})

const ActionText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'actionVariant',
})<{ actionVariant: ActionVariant }>(({ theme, actionVariant }) => ({
  fontSize: 14,
  fontWeight: 500,
  lineHeight: '18px',
  whiteSpace: 'nowrap',
  color: theme.appTokens.dashboard.action[actionVariant].text,
}))

const ActionHighlight = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 500,
  lineHeight: '18px',
  whiteSpace: 'nowrap',
  color: theme.appTokens.dashboard.pink,
}))

const ChartLegend = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(2),
  flexWrap: 'wrap',
}))

const LegendItem = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}))

const LegendDot = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'variant',
})<{ variant: 'sent' | 'received' }>(({ theme, variant }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: variant === 'sent' ? theme.appTokens.dashboard.chartSent : theme.appTokens.dashboard.chartReceived,
}))

const LegendText = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.appTokens.dashboard.textPrimary,
  whiteSpace: 'nowrap',
}))

const ChartShell = styled(Stack)(({ theme }) => ({
  width: '100%',
  height: 122,
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: theme.spacing(1),
}))

const ChartBar = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: 32,
  flexShrink: 0,
  overflow: 'hidden',
  borderRadius: 4,
  backgroundColor: theme.appTokens.dashboard.chartReceived,
}))

const ChartBarFill = styled(Box)(({ theme }) => ({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: theme.appTokens.dashboard.chartSent,
  borderRadius: '0 0 4px 4px',
}))

const ContactsList = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(0.5),
}))

const ContactRow = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(4),
  paddingTop: theme.spacing(0.5),
  paddingBottom: theme.spacing(1),
  borderBottom: `1px solid ${theme.appTokens.dashboard.border}`,
  '&:last-child': {
    borderBottom: 'none',
  },
}))

const ContactMeta = styled(Stack)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  gap: theme.spacing(0.25),
}))

const ContactName = styled(Typography)(({ theme }) => ({
  fontSize: 16,
  fontWeight: 500,
  lineHeight: 1.2,
  letterSpacing: '-0.007em',
}))

const ContactEmail = styled(Typography)(({ theme }) => ({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 14,
  letterSpacing: '-0.005em',
  color: theme.appTokens.dashboard.textTertiary,
}))

const ContactCount = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  flexShrink: 0,
  color: theme.appTokens.dashboard.textPrimary,
}))

const ContactCountText = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  letterSpacing: '-0.005em',
  whiteSpace: 'nowrap',
}))

const MeetingStack = styled(Stack)(({ theme }) => ({
  flex: 1,
  gap: theme.spacing(1),
}))

const MeetingRowShell = styled(Stack, {
  shouldForwardProp: (prop) => prop !== 'status',
})<{ status: MeetingStatus }>(({ theme, status }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1),
  paddingInline: theme.spacing(1),
  paddingBlock: theme.spacing(0.75),
  borderRadius: 4,
  backgroundColor: theme.appTokens.dashboard.meeting[status].rowBg,
}))

const MeetingTime = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'status',
})<{ status: MeetingStatus }>(({ theme, status }) => ({
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1.2,
  letterSpacing: '-0.007em',
  color: theme.appTokens.dashboard.meeting[status].text,
  whiteSpace: 'nowrap',
}))

const MeetingBadge = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'status',
})<{ status: MeetingStatus }>(({ theme, status }) => ({
  display: 'inline-flex',
  paddingInline: theme.spacing(1),
  paddingBlock: theme.spacing(0.25),
  borderRadius: 16,
  border: `1px solid ${theme.appTokens.dashboard.meeting[status].border}`,
  backgroundColor: theme.appTokens.dashboard.meeting[status].bg,
}))

const MeetingBadgeText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'status',
})<{ status: MeetingStatus }>(({ theme, status }) => ({
  fontSize: 12,
  fontWeight: 500,
  lineHeight: '18px',
  whiteSpace: 'nowrap',
  color: theme.appTokens.dashboard.meeting[status].text,
}))

const BriefingTabsRow = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
}))

const BriefingTabButton = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ theme, active = false }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(0.5),
  minWidth: 48,
  paddingInline: theme.spacing(1.25),
  paddingBlock: theme.spacing(0.75),
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

const DayPickerWrapper = styled(Box)(({ theme }) => ({
  '& .rdp-root': {
    '--rdp-accent-color': theme.appTokens.dashboard.textPrimary,
    '--rdp-accent-background-color': theme.appTokens.dashboard.surfaceMuted,
    '--rdp-range_middle-color': theme.appTokens.dashboard.textPrimary,
    '--rdp-range_middle-background-color': theme.appTokens.dashboard.surfaceMuted,
    '--rdp-day-height': '32px',
    '--rdp-day-width': '32px',
    '--rdp-day_button-height': '28px',
    '--rdp-day_button-width': '28px',
    '--rdp-day_button-border-radius': '8px',
    fontFamily: 'inherit',
    fontSize: 13,
  },
  '& .rdp-month_caption': {
    fontSize: 13,
    fontWeight: 600,
    color: theme.appTokens.dashboard.textPrimary,
    paddingBottom: 4,
  },
  '& .rdp-nav': {
    gap: 4,
  },
  '& .rdp-weekday': {
    fontSize: 11,
    fontWeight: 500,
    color: theme.appTokens.dashboard.textTertiary,
    paddingBottom: 4,
  },
  '& .rdp-day': {
    fontSize: 13,
    color: theme.appTokens.dashboard.textPrimary,
  },
  '& .rdp-day.rdp-outside': {
    color: theme.appTokens.dashboard.textTertiary,
  },
  '& .rdp-button_next, & .rdp-button_previous': {
    color: theme.appTokens.dashboard.textSecondary,
    border: `1px solid ${theme.appTokens.dashboard.borderStrong}`,
    borderRadius: 6,
    width: 28,
    height: 28,
  },
  '& .rdp-button_next:hover, & .rdp-button_previous:hover': {
    backgroundColor: theme.appTokens.dashboard.surfaceMuted,
  },
  '& .rdp-chevron': {
    width: 14,
    height: 14,
  },
  '& .rdp-today:not(.rdp-selected) .rdp-day_button': {
    fontWeight: 700,
    color: theme.appTokens.dashboard.blue,
  },
  '& .rdp-selected .rdp-day_button': {
    fontWeight: 600,
  },
  '& .rdp-range_start .rdp-day_button, & .rdp-range_end .rdp-day_button': {
    backgroundColor: theme.appTokens.dashboard.textPrimary,
    color: theme.appTokens.dashboard.canvas,
    border: `1.5px solid ${theme.appTokens.dashboard.borderStrong}`,
  },
  // Override default gradients on start/end
  '& .rdp-range_start': {
    background: `linear-gradient(to right, transparent 50%, ${theme.appTokens.dashboard.surfaceMuted} 50%)`,
  },
  '& .rdp-range_end': {
    background: `linear-gradient(to left, transparent 50%, ${theme.appTokens.dashboard.surfaceMuted} 50%)`,
  },
  '& .rdp-range_start.rdp-range_end': {
    background: 'transparent',
  },
  // Outer corners of the range rectangle:
  // Top-left = start cell
  '& .rdp-range_start:not(.rdp-range_end)': {
    borderTopLeftRadius: 8,
  },
  // Top-right = last cell in start row (could be middle or start itself)
  '& tr:has(.rdp-range_start) > td:last-of-type:is(.rdp-range_middle, .rdp-range_start)': {
    borderTopRightRadius: 8,
  },
  // Bottom-left = first cell in end row (could be middle or end itself)
  '& tr:has(.rdp-range_end) > td:first-of-type:is(.rdp-range_middle, .rdp-range_end)': {
    borderBottomLeftRadius: 8,
  },
  // Bottom-right = end cell
  '& .rdp-range_end:not(.rdp-range_start)': {
    borderBottomRightRadius: 8,
  },
  // Single-day selection: all corners
  '& .rdp-range_start.rdp-range_end': {
    borderRadius: 8,
  },
  // Step corners when range spans multiple rows:
  // Top-left of the row right after start row
  '& tr:has(.rdp-range_start):not(:has(.rdp-range_end)) + tr > td:first-of-type:is(.rdp-range_middle)': {
    borderTopLeftRadius: 8,
  },
  // Bottom-right of the row right before end row
  '& tr:has(+ tr .rdp-range_end):not(:has(.rdp-range_start)) > td:last-of-type:is(.rdp-range_middle)': {
    borderBottomRightRadius: 8,
  },
}))

const sectionHeader = (subtitle: string, title: string) => (
  <Stack gap={1}>
    <SectionEyebrow>{subtitle}</SectionEyebrow>
    <SectionTitle>{title}</SectionTitle>
  </Stack>
)

function SummaryCardItem({
  tone,
  icon,
  text,
  link,
  href,
}: {
  tone: SummaryTone
  icon: ReactNode
  text: ReactNode
  link?: string
  href?: string
}) {
  return (
    <SummaryItemStack>
      <SummaryGlyph tone={tone}>{icon}</SummaryGlyph>
      <SummaryTextStack>
        <SummaryText>{text}</SummaryText>
        {link && href ? (
          <InlineTextLink component={Link} href={href} sx={{ textDecoration: 'none' }}>
            {link}
          </InlineTextLink>
        ) : link ? (
          <InlineTextLink>{link}</InlineTextLink>
        ) : null}
      </SummaryTextStack>
    </SummaryItemStack>
  )
}

function ActionBadge({ text, variant, highlight }: { text: string; variant: ActionVariant; highlight?: string }) {
  return (
    <ActionPill variant={variant}>
      <ActionText actionVariant={variant}>{text}</ActionText>
      {highlight ? <ActionHighlight>{highlight}</ActionHighlight> : null}
    </ActionPill>
  )
}

function EmailChart({ series }: { series: SentReceivedDayDto[] }) {
  if (series.length === 0) {
    return <ChartSkeleton />
  }

  const max = Math.max(...series.map((item) => item.sent + item.received), 1)

  return (
    <ChartShell>
      {series.map((item) => {
        const total = item.sent + item.received
        const totalHeight = Math.round((total / max) * 110)
        const sentHeight = total > 0 ? Math.round((item.sent / total) * totalHeight) : 0

        return (
          <ChartBar key={item.day} style={{ height: Math.max(totalHeight, 4) }}>
            <ChartBarFill style={{ height: sentHeight }} />
          </ChartBar>
        )
      })}
    </ChartShell>
  )
}

function MeetingItem({ time, status }: { time: string; status: MeetingStatus }) {
  const labels: Record<MeetingStatus, string> = {
    confirmed: 'Confirmed',
    conflict: 'Conflict',
    pending: 'Pending',
  }

  return (
    <MeetingRowShell status={status}>
      <MeetingTime status={status}>{time}</MeetingTime>
      <MeetingBadge status={status}>
        <MeetingBadgeText status={status}>{labels[status]}</MeetingBadgeText>
      </MeetingBadge>
    </MeetingRowShell>
  )
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '') // ## headers
    .replace(/\*\*(.+?)\*\*/g, '$1') // **bold**
    .replace(/\*(.+?)\*/g, '$1') // *italic*
    .replace(/__(.+?)__/g, '$1') // __bold__
    .replace(/_(.+?)_/g, '$1') // _italic_
    .replace(/^[-*]\s+/gm, '') // - bullet points
    .replace(/^\d+\.\s+/gm, '') // 1. numbered lists
    .replace(/^---+$/gm, '') // ---
    .replace(/\n{3,}/g, '\n\n') // collapse extra newlines
    .trim()
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatDateShort(d: Date): string {
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`
}

function useTypewriter(text: string, speed = 35): string {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    setDisplayed('')
    if (!text) return

    let index = 0
    const timer = setInterval(() => {
      index++
      setDisplayed(text.slice(0, index))
      if (index >= text.length) clearInterval(timer)
    }, speed)

    return () => clearInterval(timer)
  }, [text, speed])

  return displayed
}

// Animates only the changing tail of a greeting. Finds the common prefix
// between old and new suffix, erases back to that point (speed scales
// with chars to delete: few chars → 3ms, many chars → down to 1.5ms),
// then types the new tail at normal speed.
function useGreetingSuffix(prefix: string, suffix: string, typeSpeed = 35): { text: string; done: boolean } {
  const [displayed, setDisplayed] = useState('')
  const prevSuffixRef = useRef(suffix)
  const phaseRef = useRef<'initial' | 'erasing' | 'typing' | 'done'>('initial')
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (!prefix) {
      setDisplayed('')
      return
    }

    const cleanup = () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    const full = prefix + suffix
    const isInitial = phaseRef.current === 'initial' && displayed === ''
    const suffixChanged = suffix !== prevSuffixRef.current

    if (isInitial) {
      let index = 0
      phaseRef.current = 'typing'
      timerRef.current = setInterval(() => {
        index++
        setDisplayed(full.slice(0, index))
        if (index >= full.length) {
          cleanup()
          phaseRef.current = 'done'
          prevSuffixRef.current = suffix
        }
      }, typeSpeed)
      return cleanup
    }

    if (suffixChanged) {
      const oldSuffix = prevSuffixRef.current
      let common = 0
      while (common < oldSuffix.length && common < suffix.length && oldSuffix[common] === suffix[common]) {
        common++
      }
      const charsToErase = oldSuffix.length - common
      // Scale erase speed: 1-5 chars → 3ms, 20+ chars → 1.5ms
      const eraseSpeed = Math.max(1.5, 3 - (charsToErase - 5) * (1.5 / 15))
      const keepLength = prefix.length + common
      const oldFull = prefix + oldSuffix
      let pos = oldFull.length

      phaseRef.current = 'erasing'
      timerRef.current = setInterval(() => {
        pos--
        if (pos <= keepLength) {
          cleanup()
          setDisplayed(full.slice(0, keepLength))
          let typePos = keepLength
          phaseRef.current = 'typing'
          timerRef.current = setInterval(() => {
            typePos++
            setDisplayed(full.slice(0, typePos))
            if (typePos >= full.length) {
              cleanup()
              phaseRef.current = 'done'
              prevSuffixRef.current = suffix
            }
          }, typeSpeed)
        } else {
          setDisplayed(oldFull.slice(0, pos))
        }
      }, eraseSpeed)
      return cleanup
    }
  }, [prefix, suffix, typeSpeed])

  return { text: displayed, done: phaseRef.current === 'done' }
}

// Smoothly reveals text that grows over time (e.g. SSE streaming).
// Characters "catch up" to the target at a steady pace instead of
// appearing in bursts when new chunks arrive.
function useSmoothReveal(target: string, charsPerTick = 2, intervalMs = 16): string {
  const [revealed, setRevealed] = useState('')
  const targetRef = useRef(target)
  targetRef.current = target

  useEffect(() => {
    if (!target) {
      setRevealed('')
      return
    }

    let pos = 0
    const timer = setInterval(() => {
      const current = targetRef.current
      if (pos >= current.length) {
        // Target might still grow — keep timer alive but don't advance.
        return
      }
      pos = Math.min(pos + charsPerTick, current.length)
      setRevealed(current.slice(0, pos))
    }, intervalMs)

    return () => clearInterval(timer)
  }, [target.length > 0, charsPerTick, intervalMs]) // restart only on empty→non-empty transition

  // Once streaming is done (target stopped changing), snap to full text
  // to avoid a long tail of slow reveal on short texts.
  return revealed.length < target.length ? revealed : target
}

export function DashboardPageView() {
  const dispatch = useAppDispatch()
  const displayName = useAppSelector(selectUserDisplayName)
  const importantBlock = useAppSelector(selectDigestBlock('importantEmails'))
  const requiresAttentionBlock = useAppSelector(selectDigestBlock('requiresAttention'))
  const emailsReceivedBlock = useAppSelector(selectDigestBlock('emailsReceived'))
  const newEmailsBlock = useAppSelector(selectDigestBlock('newEmails'))
  const junkBlock = useAppSelector(selectDigestBlock('junkMessages'))
  const criticalBlock = useAppSelector(selectDigestBlock('critical'))
  const suspiciousBlock = useAppSelector(selectDigestBlock('suspicious'))
  const invoicesBlock = useAppSelector(selectDigestBlock('invoices'))
  const meetingsBlock = useAppSelector(selectDigestBlock('meetings'))
  const severalBlock = useAppSelector(selectDigestBlock('severalEmails'))
  const contacts = useAppSelector(selectTopContacts)
  const chartSeries = useAppSelector(selectSentReceivedSeries)
  const totalProcessed = useAppSelector(selectDigestTotalProcessed)
  const isStreaming = useAppSelector(selectDigestStreaming)
  const briefingSummaryText = useAppSelector(selectSummaryAccumulated)
  const briefingSummaryResult = useAppSelector(selectSummaryResult)
  const briefingSummaryStreaming = useAppSelector(selectSummaryStreaming)
  const enrichmentProgress = useAppSelector(selectEnrichmentProgress)
  const enrichmentStreaming = useAppSelector(selectEnrichmentStreaming)
  const enrichmentReady = useAppSelector(selectEnrichmentReady)
  const enrichmentError = useAppSelector(selectEnrichmentError)
  const enrichmentErrors = useAppSelector(selectEnrichmentErrors)
  const briefingAgendaItems = useAppSelector(selectAgendaItems)
  const briefingAgendaStreaming = useAppSelector(selectAgendaStreaming)
  const [briefingFilter, setBriefingFilter] = useState<BriefingFilter>('unread')
  const [customRange, setCustomRange] = useState<DayPickerRange | undefined>()
  const [customAnchorEl, setCustomAnchorEl] = useState<HTMLElement | null>(null)
  const customDateFrom = customRange?.from ? formatDate(customRange.from) : ''
  const customDateTo = customRange?.to ? formatDate(customRange.to) : ''
  const customLabel =
    customRange?.from && customRange?.to
      ? `${formatDateShort(customRange.from)} — ${formatDateShort(customRange.to)}`
      : ''
  const greetingPrefix = displayName ? `Hi ${displayName}, here's your ` : ''
  const greetingSuffix = `${GREETING_SUFFIX[briefingFilter]}!`
  const { text: greetingTyped, done: greetingDone } = useGreetingSuffix(greetingPrefix, greetingSuffix)
  const briefingRawText = briefingSummaryResult?.summary ?? briefingSummaryText
  const briefingDisplayText = stripMarkdown(briefingRawText)
  const briefingSmooth = useSmoothReveal(briefingDisplayText)
  const briefingRevealing = briefingSummaryStreaming || briefingSmooth.length < briefingDisplayText.length
  const briefingScrollRef = useRef<HTMLDivElement>(null)
  const userScrolledRef = useRef(false)
  const agendaStartedRef = useRef(false)
  const forceRef = useRef(false)

  const dispatchBriefing = useCallback(
    (filter: BriefingFilter, dateFrom?: string, dateTo?: string, force?: boolean) => {
      agendaStartedRef.current = false
      userScrolledRef.current = false
      forceRef.current = force ?? false
      // Reset previous content immediately so UI shows loading state
      dispatch(briefingActions.reset())
      dispatch(digestActions.reset())
      // Start enrichment first — briefing + digest will follow after completion
      const request = { folder: 'INBOX' as const, kind: filter, dateFrom, dateTo, force }
      dispatch(enrichmentActions.requestEnrichment(request))
    },
    [dispatch],
  )

  // When enrichment completes, start briefing + digest from warm L1 cache
  const prevEnrichmentReady = useRef(false)
  useEffect(() => {
    if (enrichmentReady && !prevEnrichmentReady.current) {
      dispatch(
        briefingActions.requestSummary({
          folder: 'INBOX',
          kind: briefingFilter,
          dateFrom: customDateFrom || undefined,
          dateTo: customDateTo || undefined,
          force: forceRef.current,
        }),
      )
      dispatch(digestActions.requestStream({ folder: 'INBOX' }))
    }
    prevEnrichmentReady.current = enrichmentReady
  }, [enrichmentReady, briefingFilter, customDateFrom, customDateTo, dispatch])

  // Reset when a new briefing starts.
  useEffect(() => {
    if (briefingSummaryStreaming && !briefingSummaryText) {
      userScrolledRef.current = false
    }
  }, [briefingSummaryStreaming, briefingSummaryText])

  // Auto-scroll to bottom while content grows, unless user interacted.
  const shouldAutoScroll = briefingRevealing || briefingAgendaStreaming
  useEffect(() => {
    const el = briefingScrollRef.current
    if (!el || !shouldAutoScroll || userScrolledRef.current) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [briefingSmooth, briefingAgendaItems.length, shouldAutoScroll])

  // Lock auto-scroll when user scrolls up, unlock when user scrolls back to bottom.
  useEffect(() => {
    const el = briefingScrollRef.current
    if (!el) return

    const onUserScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30
      userScrolledRef.current = !atBottom
    }

    el.addEventListener('wheel', onUserScroll, { passive: true })
    el.addEventListener('touchmove', onUserScroll, { passive: true })
    return () => {
      el.removeEventListener('wheel', onUserScroll)
      el.removeEventListener('touchmove', onUserScroll)
    }
  }, [])

  // On mount: start enrichment → briefing + digest follow after enrichmentReady
  useEffect(() => {
    dispatchBriefing('unread')
  }, [dispatchBriefing])

  // Start agenda only after briefing text is fully revealed.
  useEffect(() => {
    if (!briefingRevealing && briefingDisplayText.length > 0 && !agendaStartedRef.current) {
      agendaStartedRef.current = true
      dispatch(
        briefingActions.requestAgenda({
          folder: 'INBOX',
          kind: briefingFilter,
          ...(briefingFilter === 'custom' ? { dateFrom: customDateFrom, dateTo: customDateTo } : {}),
          force: forceRef.current,
        }),
      )
    }
  }, [briefingRevealing, briefingDisplayText, dispatch])

  const blocks = {
    importantEmails: importantBlock,
    requiresAttention: requiresAttentionBlock,
    emailsReceived: emailsReceivedBlock,
    newEmails: newEmailsBlock,
    junkMessages: junkBlock,
    critical: criticalBlock,
    suspicious: suspiciousBlock,
    invoices: invoicesBlock,
    meetings: meetingsBlock,
    severalEmails: severalBlock,
  }

  const metrics = deriveMetrics(blocks, totalProcessed)
  const summaryItems = deriveSummaryItems(blocks)
  const importantSamples = importantBlock?.samples ?? requiresAttentionBlock?.samples ?? []
  const metricsReady = emailsReceivedBlock !== undefined
  const summaryReady = metricsReady && (!isStreaming || summaryItems.length > 0)
  const importantReady = importantBlock !== undefined || requiresAttentionBlock !== undefined
  const chartTitle = chartSeries.length > 0 ? busiestDayLabel(chartSeries) : 'Emails This Week'

  return (
    <AppShell activePage="digest">
      <ContentShell>
        <ContentGrid>
          <SurfaceCard>
            <CardSection>
              <Stack gap={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <SectionEyebrow>Email Briefing</SectionEyebrow>
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    {!isStreaming && !enrichmentStreaming && totalProcessed > 0 && (
                      <Tooltip title="Mark all as read" arrow>
                        <IconButton
                          size="small"
                          onClick={() => {
                            dispatch(inboxActions.markAllRead({ folder: 'INBOX' }))
                            setTimeout(() => dispatch(digestActions.requestStream({ folder: 'INBOX' })), 1500)
                          }}
                          sx={(theme) => ({ color: theme.appTokens.dashboard.textSecondary })}
                        >
                          <DoneAllRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!isStreaming && !enrichmentStreaming && !briefingSummaryStreaming ? (
                      <RefreshButton
                        onRefresh={(force) => {
                          dispatchBriefing(
                            briefingFilter,
                            briefingFilter === 'custom' ? customDateFrom : undefined,
                            briefingFilter === 'custom' ? customDateTo : undefined,
                            force,
                          )
                        }}
                      />
                    ) : (
                      <Tooltip title="Updating..." arrow>
                        <Box
                          component="span"
                          sx={(theme) => ({
                            display: 'inline-flex',
                            color: theme.appTokens.dashboard.green,
                            animation: `${spin} 1.2s linear infinite`,
                          })}
                        >
                          <SyncRoundedIcon sx={{ fontSize: 18 }} />
                        </Box>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>
                {displayName && (
                  <SectionTitle sx={{ minHeight: '1.2em' }}>
                    {greetingTyped}
                    {!greetingDone && greetingTyped.length > 0 && (
                      <Box
                        component="span"
                        sx={(theme) => ({
                          display: 'inline-block',
                          width: 1.5,
                          height: '0.9em',
                          ml: 0.5,
                          verticalAlign: 'middle',
                          borderRadius: 0.5,
                          backgroundColor: theme.appTokens.dashboard.green,
                          animation: `${blink} 0.8s step-end infinite`,
                        })}
                      />
                    )}
                  </SectionTitle>
                )}
              </Stack>

              <BriefingTabsRow>
                {BRIEFING_TABS.map((tab) => (
                  <BriefingTabButton
                    key={tab.id}
                    active={briefingFilter === tab.id}
                    onClick={(e: React.MouseEvent<HTMLElement>) => {
                      if (tab.id === 'custom') {
                        setCustomAnchorEl(e.currentTarget)
                        setBriefingFilter('custom')
                        return
                      }
                      if (tab.id === briefingFilter) return
                      setBriefingFilter(tab.id)
                      dispatchBriefing(tab.id)
                    }}
                  >
                    {tab.id === 'custom' && briefingFilter === 'custom' && customLabel ? customLabel : tab.label}
                  </BriefingTabButton>
                ))}
              </BriefingTabsRow>

              <Popover
                open={Boolean(customAnchorEl)}
                anchorEl={customAnchorEl}
                onClose={() => setCustomAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                  paper: {
                    sx: (theme) => ({
                      mt: 1,
                      p: 2,
                      borderRadius: '8px',
                      border: `1px solid ${theme.appTokens.dashboard.border}`,
                      backgroundColor: theme.appTokens.dashboard.surface,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    }),
                  },
                }}
              >
                <DayPickerWrapper>
                  <DayPicker
                    mode="range"
                    selected={customRange}
                    onSelect={setCustomRange}
                    numberOfMonths={1}
                    showOutsideDays
                  />
                </DayPickerWrapper>

                <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ mt: 1 }}>
                  <BriefingTabButton onClick={() => setCustomAnchorEl(null)} sx={{ borderRadius: '8px !important' }}>
                    Cancel
                  </BriefingTabButton>
                  <BriefingTabButton
                    active
                    onClick={() => {
                      if (customDateFrom && customDateTo) {
                        dispatchBriefing('custom', customDateFrom, customDateTo)
                        setCustomAnchorEl(null)
                      }
                    }}
                    sx={{ borderRadius: '8px !important' }}
                  >
                    Apply
                  </BriefingTabButton>
                </Stack>
              </Popover>

              <Box
                ref={briefingScrollRef}
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  mr: -3,
                  pr: 3,
                }}
              >
                {!!enrichmentProgress && (
                  <Fade in timeout={400} appear>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
                      <InsightsRoundedIcon
                        sx={(theme) => ({
                          fontSize: 14,
                          color: theme.appTokens.dashboard.purple,
                          animation: `${pulse} 1.5s ease-in-out infinite`,
                        })}
                      />
                      <Typography
                        sx={(theme) => ({
                          fontSize: 12,
                          fontWeight: 500,
                          color: theme.appTokens.dashboard.textSecondary,
                          fontVariantNumeric: 'tabular-nums',
                          animation: `${pulse} 1.5s ease-in-out infinite`,
                        })}
                      >
                        Processing inbox {enrichmentProgress?.current} of {enrichmentProgress?.total}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={enrichmentProgress ? (enrichmentProgress.current / enrichmentProgress.total) * 100 : 0}
                        sx={(theme) => ({
                          flex: 1,
                          height: 3,
                          borderRadius: 1.5,
                          transition: 'none',
                          backgroundColor:
                            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 1.5,
                            backgroundColor: theme.appTokens.dashboard.purple,
                            transition: 'transform 0.3s ease',
                          },
                        })}
                      />
                    </Stack>
                  </Fade>
                )}
                {(enrichmentErrors.length > 0 || enrichmentError) && (
                  <Typography
                    sx={(theme) => ({
                      fontSize: 11,
                      color: theme.palette.error.main,
                      mb: 1,
                    })}
                  >
                    {enrichmentError
                      ? enrichmentError
                      : enrichmentErrors.length === 1
                        ? enrichmentErrors[0]
                        : `${enrichmentErrors.length} messages failed to process`}
                  </Typography>
                )}

                {enrichmentStreaming && !briefingSummaryText ? (
                  <Stack gap={0.75} sx={{ opacity: 0.6 }}>
                    <Skeleton variant="text" width="92%" height={18} />
                    <Skeleton variant="text" width="100%" height={18} />
                    <Skeleton variant="text" width="85%" height={18} />
                    <Skeleton variant="text" width="96%" height={18} />
                    <Skeleton variant="text" width="60%" height={18} />
                  </Stack>
                ) : briefingRevealing && !briefingSummaryText ? (
                  <Fade in timeout={400} appear>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                      <AutoAwesomeRoundedIcon
                        sx={(theme) => ({
                          fontSize: 16,
                          color: theme.appTokens.dashboard.purple,
                          animation: `${spin} 2s linear infinite`,
                        })}
                      />
                      <Typography
                        sx={(theme) => ({
                          fontSize: 13,
                          color: theme.appTokens.dashboard.textSecondary,
                        })}
                      >
                        Generating briefing...
                      </Typography>
                    </Stack>
                  </Fade>
                ) : (
                  <Box sx={{ mb: 2 }}>
                    {briefingRevealing && (
                      <Stack direction="row" alignItems="center" gap={0.75} sx={{ mb: 1 }}>
                        <AutoAwesomeRoundedIcon
                          sx={(theme) => ({
                            fontSize: 14,
                            color: theme.appTokens.dashboard.purple,
                          })}
                        />
                        <Typography
                          sx={(theme) => ({
                            fontSize: 12,
                            fontWeight: 500,
                            color: theme.appTokens.dashboard.purple,
                          })}
                        >
                          AI is writing...
                        </Typography>
                      </Stack>
                    )}
                    <Typography
                      sx={(theme) => ({
                        fontSize: 14,
                        fontWeight: 500,
                        lineHeight: 1.6,
                        color: theme.appTokens.dashboard.textPrimary,
                        whiteSpace: 'pre-line',
                      })}
                    >
                      {briefingSmooth}
                      {briefingRevealing && (
                        <Box
                          component="span"
                          sx={(theme) => ({
                            display: 'inline-block',
                            width: 1.5,
                            height: '1.15em',
                            ml: 0.5,
                            verticalAlign: 'middle',
                            borderRadius: 0.5,
                            backgroundColor: theme.appTokens.dashboard.green,
                            animation: `${blink} 0.8s step-end infinite`,
                          })}
                        />
                      )}
                    </Typography>
                  </Box>
                )}

                {!briefingRevealing && briefingDisplayText.length > 0 && (
                  <>
                    {briefingAgendaStreaming && briefingAgendaItems.length === 0 ? (
                      <Stack direction="row" alignItems="center" gap={0.75} sx={{ mt: 2, mb: 1 }}>
                        <AutoAwesomeRoundedIcon
                          sx={(theme) => ({
                            fontSize: 14,
                            color: theme.appTokens.dashboard.purple,
                            animation: `${spin} 2s linear infinite`,
                          })}
                        />
                        <Typography
                          sx={(theme) => ({
                            fontSize: 12,
                            fontWeight: 500,
                            color: theme.appTokens.dashboard.purple,
                          })}
                        >
                          Generating agenda...
                        </Typography>
                      </Stack>
                    ) : (
                      <>
                        <Stack direction="row" alignItems="center" gap={0.75} sx={{ mt: 2, mb: 1 }}>
                          {briefingAgendaStreaming && (
                            <AutoAwesomeRoundedIcon
                              sx={(theme) => ({
                                fontSize: 14,
                                color: theme.appTokens.dashboard.purple,
                              })}
                            />
                          )}
                          <Typography
                            sx={(theme) => ({
                              fontSize: 13,
                              fontWeight: 600,
                              lineHeight: 1.2,
                              letterSpacing: '-0.02em',
                              color: briefingAgendaStreaming
                                ? theme.appTokens.dashboard.purple
                                : theme.appTokens.dashboard.textSecondary,
                              textTransform: 'uppercase',
                            })}
                          >
                            {briefingAgendaStreaming ? 'AI is writing agenda...' : 'Proposed Agenda'}
                          </Typography>
                        </Stack>

                        {briefingAgendaItems.length === 0 && !briefingAgendaStreaming ? (
                          <Typography
                            sx={(theme) => ({
                              fontSize: 14,
                              color: theme.appTokens.dashboard.textSecondary,
                            })}
                          >
                            No actionable items detected.
                          </Typography>
                        ) : (
                          <Stack gap={0.75}>
                            {briefingAgendaItems.map((item, index) => (
                              <Fade key={`${item.metadata.sourceUid || index}`} in timeout={400} appear>
                                <Stack direction="row" gap={1.5} alignItems="center">
                                  <Typography
                                    sx={(theme) => ({
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color:
                                        item.priority === 'high'
                                          ? theme.appTokens.dashboard.red
                                          : theme.appTokens.dashboard.blue,
                                      whiteSpace: 'nowrap',
                                      fontVariantNumeric: 'tabular-nums',
                                      flexShrink: 0,
                                    })}
                                  >
                                    {item.priority === 'high' ? '!!!' : item.priority === 'normal' ? '!!' : '!'}
                                  </Typography>
                                  <Typography
                                    sx={(theme) => ({
                                      fontSize: 14,
                                      lineHeight: 1.5,
                                      color: theme.appTokens.dashboard.textPrimary,
                                      flex: 1,
                                      minWidth: 0,
                                    })}
                                  >
                                    {item.title}
                                  </Typography>
                                  <Box
                                    sx={(theme) => ({
                                      flex: 1,
                                      minWidth: 16,
                                      borderBottom: `1px dotted ${theme.appTokens.dashboard.border}`,
                                      alignSelf: 'center',
                                      mb: 0.25,
                                    })}
                                  />
                                  <Stack direction="row" gap={0.5} flexShrink={0}>
                                    <Tooltip title="Add to calendar" arrow>
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          /* stub */
                                        }}
                                        sx={(theme) => ({
                                          width: 28,
                                          height: 28,
                                          color: theme.appTokens.dashboard.textTertiary,
                                          transition: 'color 0.12s ease',
                                          '&:hover': { color: theme.appTokens.dashboard.blue },
                                        })}
                                      >
                                        <EditCalendarOutlinedIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Open with" arrow>
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          /* stub */
                                        }}
                                        sx={(theme) => ({
                                          width: 28,
                                          height: 28,
                                          color: theme.appTokens.dashboard.textTertiary,
                                          transition: 'color 0.12s ease',
                                          '&:hover': { color: theme.appTokens.dashboard.textPrimary },
                                        })}
                                      >
                                        <OpenInNewRoundedIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                </Stack>
                              </Fade>
                            ))}
                          </Stack>
                        )}
                      </>
                    )}
                  </>
                )}
              </Box>
            </CardSection>
          </SurfaceCard>

          <SurfaceCard>
            <Box sx={{ mb: 1 }}>{sectionHeader('Your Email Overview')}</Box>
            {metricsReady ? (
              <Fade in timeout={240} appear>
                <MetricsBar sx={{ mb: 2 }}>
                  {metrics.map((item) => (
                    <MetricStack key={item.label}>
                      <MetricValue metricColor={item.color}>{item.count}</MetricValue>
                      <MetricLabel>{item.label}</MetricLabel>
                    </MetricStack>
                  ))}
                </MetricsBar>
              </Fade>
            ) : (
              <Box sx={{ mb: 2 }}>
                <MetricsSkeleton />
              </Box>
            )}
            <CardSection>
              {summaryReady ? (
                <SummaryGrid>
                  {summaryItems.length === 0 ? (
                    <Fade in timeout={400} appear>
                      <Box gridColumn="1 / -1">
                        <SectionEyebrow>No summary items for the selected window.</SectionEyebrow>
                      </Box>
                    </Fade>
                  ) : (
                    summaryItems.map((item, index) => (
                      <Fade key={item.id} in timeout={400} style={{ transitionDelay: `${index * 100}ms` }} appear>
                        <Box>
                          <SummaryCardItem
                            icon={summaryItemIcon(item)}
                            link={item.link}
                            href={item.href}
                            text={item.text}
                            tone={item.tone}
                          />
                        </Box>
                      </Fade>
                    ))
                  )}
                </SummaryGrid>
              ) : (
                <SummaryGridSkeleton items={8} />
              )}
            </CardSection>
          </SurfaceCard>
        </ContentGrid>

        <BottomGrid>
          <SurfaceCard>
            <CardSection sx={{ height: '100%', justifyContent: 'space-between' }}>
              <Stack gap={2}>
                {sectionHeader('Emails Sent vs Received Over the Last 7 Days', chartTitle)}
                <ChartLegend>
                  <LegendItem>
                    <LegendDot variant="sent" />
                    <LegendText>Email sent</LegendText>
                  </LegendItem>
                  <LegendItem>
                    <LegendDot variant="received" />
                    <LegendText>Email received</LegendText>
                  </LegendItem>
                </ChartLegend>
              </Stack>
              {chartSeries.length === 0 ? (
                <ChartSkeleton />
              ) : (
                <Fade in timeout={320} appear>
                  <Box>
                    <EmailChart series={chartSeries} />
                  </Box>
                </Fade>
              )}
            </CardSection>
          </SurfaceCard>

          <SurfaceCard>
            <CardSection>
              {sectionHeader('The most active users you have interacted with', 'Your top email Contacts this week')}
              {contacts.length === 0 ? (
                <ContactsSkeleton rows={4} />
              ) : (
                <ContactsList
                  sx={{
                    opacity: 0,
                    animation: 'contactsFadeIn 0.5s ease-out 0.05s forwards',
                    '@keyframes contactsFadeIn': { to: { opacity: 1 } },
                  }}
                >
                  {contacts.map((contact) => (
                    <ContactRow key={contact.email}>
                      <ContactMeta>
                        <ContactName>{contact.name}</ContactName>
                        <ContactEmail>{contact.email}</ContactEmail>
                      </ContactMeta>
                      <ContactCount>
                        <MoveToInboxRoundedIcon sx={{ fontSize: 16 }} />
                        <ContactCountText>{contact.count}</ContactCountText>
                      </ContactCount>
                    </ContactRow>
                  ))}
                </ContactsList>
              )}
            </CardSection>
          </SurfaceCard>

          <SurfaceCard>
            <CardSection sx={{ height: '100%' }}>
              {sectionHeader('Your schedule needs your attention', 'Calendar integration not yet available')}
              <NotImplementedNotice message="Meeting overview and conflict detection arrive when the calendar provider is connected in a later phase." />
            </CardSection>
          </SurfaceCard>
        </BottomGrid>
      </ContentShell>
    </AppShell>
  )
}
