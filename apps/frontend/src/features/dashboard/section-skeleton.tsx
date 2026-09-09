/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client';

import { Box, Skeleton, Stack } from '@mui/material';

interface SectionSkeletonProps {
  rows?: number;
  rowHeight?: number;
}

// Lightweight placeholder for digest sections that have not received their
// SSE payload yet. Uses MUI Skeleton's pulse animation to signal "loading"
// without committing to a specific layout.
export function SectionSkeleton({ rows = 3, rowHeight = 24 }: SectionSkeletonProps) {
  return (
    <Stack gap={1.25} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} variant="rectangular" height={rowHeight} sx={{ borderRadius: 1 }} />
      ))}
    </Stack>
  );
}

export function MetricsSkeleton() {
  return (
    <Stack direction="row" gap={3}>
      {Array.from({ length: 4 }, (_, index) => (
        <Box key={index} flex={1}>
          <Skeleton variant="text" width={48} height={32} />
          <Skeleton variant="text" width={120} height={16} />
        </Box>
      ))}
    </Stack>
  );
}

const CHART_BARS = [
  { min: 30, max: 70 },
  { min: 60, max: 100 },
  { min: 20, max: 50 },
  { min: 40, max: 75 },
  { min: 15, max: 45 },
  { min: 50, max: 90 },
  { min: 18, max: 40 },
];

export function ChartSkeleton() {
  return (
    <Stack
      direction="row"
      alignItems="flex-end"
      justifyContent="space-between"
      gap={1}
      sx={{ height: 122, width: '100%' }}
      aria-busy="true"
      aria-live="polite"
    >
      {CHART_BARS.map((bar, index) => (
        <Skeleton
          key={index}
          variant="rectangular"
          width={32}
          sx={{
            borderRadius: 1,
            flexShrink: 0,
            height: bar.min,
            animation: `chartBar${index} 2.4s ease-in-out ${index * 0.2}s infinite`,
            [`@keyframes chartBar${index}`]: {
              '0%, 100%': { height: bar.min },
              '50%': { height: bar.max },
            },
          }}
        />
      ))}
    </Stack>
  );
}

const CONTACT_NAME_WIDTHS = [160, 130, 180, 110];
const CONTACT_EMAIL_WIDTHS = [210, 190, 170, 200];

const SUMMARY_ITEM_WIDTHS = [
  { text: '75%', link: '35%' },
  { text: '85%', link: '40%' },
  { text: '65%', link: '30%' },
  { text: '80%', link: '25%' },
  { text: '70%', link: '38%' },
];

export function SummaryGridSkeleton({ items = 8 }: { items?: number }) {
  return (
    <Box
      display="grid"
      gridTemplateColumns="repeat(2, minmax(0, 1fr))"
      gap={2}
      flex={1}
      alignContent="start"
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: items }, (_, index) => {
        const cfg = SUMMARY_ITEM_WIDTHS[index % SUMMARY_ITEM_WIDTHS.length];
        return (
          <Stack key={index} direction="row" alignItems="flex-start" gap={1.5}>
            <Skeleton variant="circular" width={24} height={24} sx={{ flexShrink: 0 }} />
            <Stack gap={0.5} flex={1}>
              <Skeleton variant="text" sx={{ width: cfg.text, height: 18 }} />
              <Skeleton variant="text" sx={{ width: cfg.link, height: 14 }} />
            </Stack>
          </Stack>
        );
      })}
    </Box>
  );
}

export function ContactsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Stack gap={0.5} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, index) => (
        <Stack
          key={index}
          direction="row"
          alignItems="center"
          gap={4}
          sx={(theme) => ({
            py: 1,
            borderBottom: index < rows - 1 ? `1px solid ${theme.appTokens.dashboard.border}` : 'none',
          })}
        >
          <Stack flex={1} gap={0.25}>
            <Skeleton variant="text" width={CONTACT_NAME_WIDTHS[index % CONTACT_NAME_WIDTHS.length]} height={20} />
            <Skeleton variant="text" width={CONTACT_EMAIL_WIDTHS[index % CONTACT_EMAIL_WIDTHS.length]} height={16} />
          </Stack>
          <Skeleton variant="text" width={32} height={20} />
        </Stack>
      ))}
    </Stack>
  );
}
