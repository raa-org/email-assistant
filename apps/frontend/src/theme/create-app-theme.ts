/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import type { ThemeMode } from '../state/app/actions';
import { createAppTokens } from './app-theme-tokens';

export function createAppTheme(mode: ThemeMode): Theme {
  const appTokens = createAppTokens(mode);
  const { dashboard, fonts } = appTokens;

  return responsiveFontSizes(
    createTheme({
      appTokens,
      palette: {
        mode,
        primary: {
          main: dashboard.blue,
          dark: dashboard.green
        },
        secondary: {
          main: dashboard.orange,
          dark: dashboard.amber
        },
        background: {
          default: dashboard.canvas,
          paper: dashboard.surface
        },
        text: {
          primary: dashboard.textPrimary,
          secondary: dashboard.textSecondary
        },
        divider: dashboard.border
      },
      shape: {
        borderRadius: 16
      },
      typography: {
        fontFamily: fonts.sans,
        h1: {
          fontFamily: fonts.display,
          fontWeight: 600,
          lineHeight: 0.98,
          letterSpacing: '-0.04em'
        },
        h2: {
          fontFamily: fonts.display,
          fontWeight: 600,
          letterSpacing: '-0.03em'
        },
        h4: {
          fontFamily: fonts.display,
          fontWeight: 600,
          letterSpacing: '-0.03em'
        },
        h5: {
          fontFamily: fonts.display,
          fontWeight: 600,
          letterSpacing: '-0.02em'
        },
        subtitle1: {
          fontWeight: 500,
          letterSpacing: '-0.01em'
        },
        body2: {
          letterSpacing: '-0.01em'
        },
        button: {
          textTransform: 'none',
          fontWeight: 600
        }
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            ':root': {
              colorScheme: mode
            },
            html: {
              minHeight: '100%'
            },
            body: {
              minHeight: '100%',
              background: dashboard.canvasGradient
            }
          }
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backdropFilter: 'blur(18px)',
              boxShadow: 'none'
            }
          }
        },
        MuiCard: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              backgroundColor: dashboard.surface,
              border: `1px solid ${dashboard.border}`,
              boxShadow: 'none'
            }
          }
        },
        MuiButton: {
          defaultProps: {
            disableElevation: true
          },
          styleOverrides: {
            root: {
              borderRadius: 12,
              paddingInline: 18
            },
            containedPrimary: {
              background: dashboard.brandGradient
            },
            outlined: {
              borderColor: dashboard.borderStrong
            }
          }
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 999,
              fontWeight: 500
            },
            filledPrimary: {
              background: dashboard.brandGradient
            },
            outlined: {
              borderColor: dashboard.borderStrong
            }
          }
        },
        MuiDivider: {
          styleOverrides: {
            root: {
              borderColor: dashboard.border
            }
          }
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none'
            }
          }
        }
      } as never
    })
  );
}
