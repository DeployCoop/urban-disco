import { createTheme, alpha } from '@mui/material/styles'

const tokens = {
  navy: {
    900: '#0F172A',
    800: '#1E293B',
    700: '#334155',
    600: '#475569',
    500: '#64748B',
    400: '#94A3B8',
    300: '#CBD5E1',
    200: '#E2E8F0',
    100: '#F1F5F9',
  },
  cyan: {
    500: '#06B6D4',
    400: '#22D3EE',
    300: '#67E8F9',
  },
  rose: {
    500: '#F43F5E',
    400: '#FB7185',
  },
  red: {
    600: '#DC2626',
    500: '#EF4444',
    400: '#F87171',
  },
  orange: {
    600: '#EA580C',
    500: '#F97316',
    400: '#FB923C',
  },
  amber: {
    500: '#F59E0B',
    400: '#FBBF24',
  },
  yellow: {
    600: '#CA8A04',
    500: '#EAB308',
    400: '#FACC15',
  },
  emerald: {
    500: '#10B981',
    400: '#34D399',
  },
}

export const severityColors = {
  critical: tokens.red[600],
  high: tokens.red[500],
  medium: tokens.orange[500],
  low: tokens.yellow[400],
}

export const statusColors = {
  open: tokens.cyan[500],
  'in-progress': tokens.amber[500],
  'in_progress': tokens.amber[500],
  resolved: tokens.emerald[500],
  closed: tokens.navy[500],
  pending: tokens.amber[500],
  approved: tokens.emerald[500],
  rejected: tokens.rose[500],
  executed: tokens.cyan[500],
}

export const createM3Theme = (mode: 'light' | 'dark') => {
  const isDark = mode === 'dark'
  
  return createTheme({
    palette: {
      mode,
      primary: {
        main: tokens.cyan[500],
        light: tokens.cyan[400],
        dark: tokens.cyan[500],
        contrastText: '#fff',
      },
      secondary: {
        main: tokens.navy[500],
        light: tokens.navy[400],
        dark: tokens.navy[700],
      },
      error: {
        main: tokens.rose[500],
        light: tokens.rose[400],
      },
      warning: {
        main: tokens.amber[500],
        light: tokens.amber[400],
      },
      success: {
        main: tokens.emerald[500],
        light: tokens.emerald[400],
      },
      background: {
        default: isDark ? tokens.navy[900] : tokens.navy[100],
        paper: isDark ? tokens.navy[800] : '#ffffff',
      },
      text: {
        primary: isDark ? tokens.navy[100] : tokens.navy[900],
        secondary: isDark ? tokens.navy[400] : tokens.navy[600],
      },
      divider: isDark ? alpha('#fff', 0.08) : alpha('#000', 0.08),
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h1: { fontWeight: 600, letterSpacing: '-0.02em' },
      h2: { fontWeight: 600, letterSpacing: '-0.02em' },
      h3: { fontWeight: 600, letterSpacing: '-0.01em' },
      h4: { fontWeight: 600, letterSpacing: '-0.01em' },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 500 },
      body1: { fontSize: '0.875rem' },
      body2: { fontSize: '0.8125rem' },
      caption: { fontSize: '0.75rem', color: isDark ? tokens.navy[400] : tokens.navy[500] },
      button: { textTransform: 'none', fontWeight: 500 },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: isDark ? `${tokens.navy[600]} ${tokens.navy[800]}` : undefined,
            '&::-webkit-scrollbar': { width: 8, height: 8 },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: isDark ? tokens.navy[600] : tokens.navy[300],
              borderRadius: 4,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: isDark ? tokens.navy[800] : tokens.navy[100],
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '6px 16px',
            fontWeight: 500,
          },
          contained: {
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          containedPrimary: {
            backgroundColor: tokens.cyan[500],
            '&:hover': { backgroundColor: tokens.cyan[400] },
          },
        },
        defaultProps: {
          disableElevation: true,
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 12,
          },
          outlined: {
            borderColor: isDark ? alpha('#fff', 0.08) : alpha('#000', 0.08),
          },
        },
        defaultProps: {
          elevation: 0,
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${isDark ? alpha('#fff', 0.08) : alpha('#000', 0.08)}`,
            backgroundImage: 'none',
          },
        },
        defaultProps: {
          elevation: 0,
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 16,
            '&:last-child': { paddingBottom: 16 },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 500,
            fontSize: '0.75rem',
          },
          sizeSmall: {
            height: 22,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: isDark ? alpha('#fff', 0.06) : alpha('#000', 0.06),
            padding: '8px 12px',
            fontSize: '0.8125rem',
          },
          head: {
            fontWeight: 600,
            backgroundColor: isDark ? tokens.navy[900] : tokens.navy[100],
            color: isDark ? tokens.navy[300] : tokens.navy[700],
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 40,
          },
          indicator: {
            height: 2,
            borderRadius: 1,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 40,
            padding: '8px 16px',
            fontWeight: 500,
            textTransform: 'none',
            fontSize: '0.875rem',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              '& fieldset': {
                borderColor: isDark ? alpha('#fff', 0.12) : alpha('#000', 0.12),
              },
              '&:hover fieldset': {
                borderColor: isDark ? alpha('#fff', 0.2) : alpha('#000', 0.2),
              },
            },
          },
        },
        defaultProps: {
          size: 'small',
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
        defaultProps: {
          size: 'small',
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            backgroundImage: 'none',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontSize: '1.125rem',
            fontWeight: 600,
            padding: '16px 20px',
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: '8px 20px 16px',
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: '12px 20px 16px',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: tokens.navy[700],
            fontSize: '0.75rem',
            borderRadius: 6,
            padding: '6px 10px',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
          standardError: {
            backgroundColor: isDark ? alpha(tokens.rose[500], 0.15) : alpha(tokens.rose[500], 0.1),
            color: isDark ? tokens.rose[400] : tokens.rose[500],
          },
          standardWarning: {
            backgroundColor: isDark ? alpha(tokens.amber[500], 0.15) : alpha(tokens.amber[500], 0.1),
            color: isDark ? tokens.amber[400] : tokens.amber[500],
          },
          standardSuccess: {
            backgroundColor: isDark ? alpha(tokens.emerald[500], 0.15) : alpha(tokens.emerald[500], 0.1),
            color: isDark ? tokens.emerald[400] : tokens.emerald[500],
          },
          standardInfo: {
            backgroundColor: isDark ? alpha(tokens.cyan[500], 0.15) : alpha(tokens.cyan[500], 0.1),
            color: isDark ? tokens.cyan[400] : tokens.cyan[500],
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: isDark ? tokens.navy[900] : '#fff',
            borderRight: `1px solid ${isDark ? alpha('#fff', 0.08) : alpha('#000', 0.08)}`,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: '2px 8px',
            padding: '8px 12px',
            '&.Mui-selected': {
              backgroundColor: isDark ? alpha(tokens.cyan[500], 0.15) : alpha(tokens.cyan[500], 0.1),
              '&:hover': {
                backgroundColor: isDark ? alpha(tokens.cyan[500], 0.2) : alpha(tokens.cyan[500], 0.15),
              },
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            minWidth: 36,
            color: 'inherit',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiSnackbar: {
        defaultProps: {
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
        },
      },
    },
  })
}

export { tokens }
