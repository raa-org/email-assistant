/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { alpha } from '@mui/material/styles';
import type { ThemeMode } from '../state/app/actions';

export interface StatusBadgeToken {
  bg: string;
  border: string;
  text: string;
  rowBg: string;
}

export interface ActionBadgeToken {
  bg: string;
  border: string;
  text: string;
}

export interface AppThemeTokens {
  fonts: {
    sans: string;
    display: string;
    mono: string;
  };
  layout: {
    headerHeight: number;
    sidebarOffset: number;
    sidebarWidth: number;
    pageGutter: number;
  };
  dashboard: {
    canvas: string;
    canvasGradient: string;
    surface: string;
    surfaceMuted: string;
    surfaceElevated: string;
    border: string;
    borderStrong: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textInverse: string;
    textInverseMuted: string;
    sidebar: string;
    sidebarActive: string;
    sidebarHover: string;
    searchSurface: string;
    searchBorder: string;
    avatarSurface: string;
    brandGradient: string;
    blue: string;
    orange: string;
    green: string;
    amber: string;
    red: string;
    pink: string;
    purple: string;
    chartReceived: string;
    chartSent: string;
    summaryGlyphs: {
      info: string;
      warning: string;
      success: string;
      danger: string;
      accent: string;
    };
    meeting: {
      confirmed: StatusBadgeToken;
      conflict: StatusBadgeToken;
      pending: StatusBadgeToken;
    };
    action: {
      warning: ActionBadgeToken;
      neutral: ActionBadgeToken;
      error: ActionBadgeToken;
    };
  };
}

declare module '@mui/material/styles' {
  interface Theme {
    appTokens: AppThemeTokens;
  }

  interface ThemeOptions {
    appTokens?: AppThemeTokens;
  }
}

const sansFont = '"Inter", "Segoe UI", "Helvetica Neue", ui-sans-serif, system-ui, sans-serif';
const monoFont = '"JetBrains Mono", "SFMono-Regular", ui-monospace, monospace';

export function createAppTokens(mode: ThemeMode): AppThemeTokens {
  const isDark = mode === 'dark';

  const dashboard = isDark
    ? {
        canvas: '#1a1c21',
        canvasGradient: 'radial-gradient(circle at 14% 18%, rgba(73, 204, 144, 0.04), transparent 22%), radial-gradient(circle at 82% 10%, rgba(97, 175, 254, 0.04), transparent 20%), linear-gradient(180deg, #1c1e23 0%, #1a1c21 100%)',
        surface: '#1c1e24',
        surfaceMuted: '#252830',
        surfaceElevated: '#2d3038',
        border: 'rgba(140, 160, 190, 0.14)',
        borderStrong: 'rgba(140, 160, 190, 0.22)',
        textPrimary: '#dcddde',
        textSecondary: '#8a8d94',
        textTertiary: '#5c5f66',
        textInverse: '#dcddde',
        textInverseMuted: 'rgba(220, 221, 222, 0.58)',
        sidebar: '#121317',
        sidebarActive: alpha('#ffffff', 0.1),
        sidebarHover: alpha('#ffffff', 0.05),
        searchSurface: '#1c1e24',
        searchBorder: 'rgba(140, 160, 190, 0.16)',
        avatarSurface: '#252830',
        brandGradient: 'linear-gradient(135deg, #49cc90 0%, #61affe 100%)',
        blue: '#61affe',
        orange: '#f9a825',
        green: '#49cc90',
        amber: '#f9a825',
        red: '#f93e3e',
        pink: '#e06090',
        purple: '#9076e0',
        chartReceived: alpha('#49cc90', 0.5),
        chartSent: '#49cc90',
        summaryGlyphs: {
          info: alpha('#61affe', 0.14),
          warning: alpha('#f9a825', 0.12),
          success: alpha('#49cc90', 0.12),
          danger: alpha('#f93e3e', 0.12),
          accent: alpha('#9076e0', 0.14),
        },
        meeting: {
          confirmed: { bg: alpha('#49cc90', 0.1), border: alpha('#49cc90', 0.2), text: '#49cc90', rowBg: '#192019' },
          conflict: { bg: alpha('#f93e3e', 0.1), border: alpha('#f93e3e', 0.2), text: '#f93e3e', rowBg: '#201515' },
          pending: { bg: alpha('#f9a825', 0.1), border: alpha('#f9a825', 0.2), text: '#f9a825', rowBg: '#201c15' },
        },
        action: {
          warning: { bg: alpha('#f9a825', 0.1), border: alpha('#f9a825', 0.25), text: '#fcd06a' },
          neutral: { bg: '#252830', border: 'rgba(140, 160, 190, 0.16)', text: '#cccdd0' },
          error: { bg: alpha('#f93e3e', 0.1), border: alpha('#f93e3e', 0.2), text: '#fca0a0' },
        },
      }
    : {
        canvas: '#f4f8fb',
        canvasGradient:
          'radial-gradient(circle at 14% 18%, rgba(51, 141, 231, 0.09), transparent 22%), radial-gradient(circle at 82% 10%, rgba(0, 183, 76, 0.08), transparent 20%), linear-gradient(180deg, #f7fbff 0%, #edf4f8 100%)',
        surface: '#ffffff',
        surfaceMuted: '#f7fafb',
        surfaceElevated: '#ffffff',
        border: '#e2e8f0',
        borderStrong: '#cbd5e1',
        textPrimary: '#181a20',
        textSecondary: '#475569',
        textTertiary: '#94a3b8',
        textInverse: '#ffffff',
        textInverseMuted: 'rgba(255, 255, 255, 0.65)',
        sidebar: '#1e293b',
        sidebarActive: alpha('#ffffff', 0.12),
        sidebarHover: alpha('#ffffff', 0.08),
        searchSurface: '#f7fafb',
        searchBorder: '#cbd5e1',
        avatarSurface: '#eef2ff',
        brandGradient: 'linear-gradient(135deg, #00b74c 0%, #338de7 100%)',
        blue: '#338de7',
        orange: '#ff9400',
        green: '#00b74c',
        amber: '#b24b02',
        red: '#b21935',
        pink: '#eb5e75',
        purple: '#8a38f5',
        chartReceived: alpha('#00b74c', 0.5),
        chartSent: '#00b74c',
        summaryGlyphs: {
          info: alpha('#338de7', 0.1),
          warning: alpha('#ff9400', 0.1),
          success: alpha('#00b74c', 0.1),
          danger: alpha('#eb5e75', 0.1),
          accent: alpha('#8a38f5', 0.1),
        },
        meeting: {
          confirmed: {
            bg: '#e8fcf9',
            border: '#d0f5db',
            text: '#007542',
            rowBg: '#f6faff',
          },
          conflict: {
            bg: '#ffe0e0',
            border: '#ffdfe2',
            text: '#b21935',
            rowBg: '#fcf0f2',
          },
          pending: {
            bg: '#fffceb',
            border: '#fff4c5',
            text: '#b24b02',
            rowBg: '#f6faff',
          },
        },
        action: {
          warning: {
            bg: '#fffcf7',
            border: 'rgba(255, 193, 107, 0.8)',
            text: '#3d434d',
          },
          neutral: {
            bg: '#ffffff',
            border: '#cacbcc',
            text: '#3d434d',
          },
          error: {
            bg: '#fff5f6',
            border: 'rgba(234, 93, 117, 0.5)',
            text: '#3d434d',
          },
        },
      };

  return {
    fonts: {
      sans: sansFont,
      display: sansFont,
      mono: monoFont,
    },
    layout: {
      headerHeight: 62,
      sidebarOffset: 16,
      sidebarWidth: 56,
      pageGutter: 24,
    },
    dashboard,
  };
}
