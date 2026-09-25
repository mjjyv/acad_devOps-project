// ============================================================================
// ACAD COMMUNITY PLATFORM - DESIGN TOKENS
// ============================================================================

export const BREAKPOINTS = {
  mobile_sm: '360px',
  mobile_lg: '480px',
  tablet: '768px',
  desktop_sm: '1024px',
  desktop_lg: '1280px',
  desktop_xl: '1536px',
} as const;

export const LAYOUT = {
  maxWidth: '1440px',
  topNavbarHeight: '56px',
  leftRailWidth: '240px',
  centerStageMaxWidth: '768px',
  rightRailWidth: '320px',
} as const;

export const TYPOGRAPHY = {
  fontSans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontMono: '"JetBrains Mono", "Fira Code", monospace',
  scale: {
    display: { size: '36px', lineHeight: '44px', weight: '800', tracking: '-0.02em' },
    h1:      { size: '30px', lineHeight: '38px', weight: '700', tracking: '-0.015em' },
    h2:      { size: '24px', lineHeight: '32px', weight: '700', tracking: '-0.01em' },
    h3:      { size: '20px', lineHeight: '28px', weight: '600', tracking: '-0.005em' },
    bodyLg:  { size: '16px', lineHeight: '24px', weight: '400', tracking: '0' },
    bodyMd:  { size: '14px', lineHeight: '20px', weight: '400', tracking: '0' },
    bodySm:  { size: '12px', lineHeight: '16px', weight: '400', tracking: '0.01em' },
    caption: { size: '11px', lineHeight: '14px', weight: '500', tracking: '0.02em' },
  },
} as const;

export const COLOR_SEMANTICS = {
  light: {
    surfaceCanvas:     '#F8FAFC',
    surfaceElevated1: '#FFFFFF',
    surfaceElevated2: '#F1F5F9',
    borderSubtle:      '#E2E8F0',
    borderStrong:      '#CBD5E1',
    textPrimary:       '#0F172A',
    textSecondary:     '#475569',
    textMuted:         '#94A3B8',
    brandPrimary:      '#2563EB',
    brandInteractive:  '#1D4ED8',
    voteUp:            '#EA580C',
    voteDown:          '#4F46E5',
    statusDanger:      '#DC2626',
    statusSuccess:     '#16A34A',
    statusWarning:     '#CA8A04',
  },
  dark: {
    surfaceCanvas:     '#0B0F17',
    surfaceElevated1: '#131926',
    surfaceElevated2: '#1E2638',
    borderSubtle:      '#242F45',
    borderStrong:      '#334155',
    textPrimary:       '#F8FAFC',
    textSecondary:     '#94A3B8',
    textMuted:         '#64748B',
    brandPrimary:      '#3B82F6',
    brandInteractive:  '#60A5FA',
    voteUp:            '#F97316',
    voteDown:          '#6366F1',
    statusDanger:      '#EF4444',
    statusSuccess:     '#22C55E',
    statusWarning:     '#EAB308',
  },
} as const;

export const TAILWIND_PRESET = {
  theme: {
    extend: {
      screens: BREAKPOINTS,
      colors: {
        surface: {
          canvas: 'var(--surface-canvas)',
          elevated1: 'var(--surface-elevated-1)',
          elevated2: 'var(--surface-elevated-2)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        vote: {
          up: 'var(--vote-up)',
          down: 'var(--vote-down)',
        },
      },
    },
  },
};
