import { Box, Paper, Stack, Typography, useTheme } from '@mui/material'
import type { ReactNode } from 'react'

/** Chart ink that follows the light/dark theme instead of hard-coded greys. */
export function useInk() {
  const t = useTheme()
  return {
    primary: t.palette.text.primary, secondary: t.palette.text.secondary, grid: t.palette.divider, cursor: t.palette.action.hover,
    tooltip: { background: t.palette.background.paper, color: t.palette.text.primary, border: `1px solid ${t.palette.divider}`, borderRadius: 10, boxShadow: '0 8px 24px -8px rgba(0,0,0,.35)' },
  }
}

/** A vertical or horizontal gradient for bar fills. Same hue family, so identity is never colour-alone. */
export function BarGradient({ id, from, to, horizontal = false }: { id: string; from: string; to: string; horizontal?: boolean }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2={horizontal ? '1' : '0'} y2={horizontal ? '0' : '1'}>
        <stop offset="0%" stopColor={from} />
        <stop offset="100%" stopColor={to} />
      </linearGradient>
    </defs>
  )
}

interface Props {
  title: string
  subtitle?: string
  controls?: ReactNode
  caption?: ReactNode
  loading?: boolean
  empty?: boolean
  accent?: string
  children: ReactNode
}

/** Title states the question the chart answers; a single series needs no legend. */
export default function ChartCard({ title, subtitle, controls, caption, loading, empty, accent, children }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: '100%', position: 'relative', overflow: 'hidden' }}>
      {accent && <Box aria-hidden sx={{ position: 'absolute', inset: '0 0 auto 0', height: 3, background: accent }} />}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 1.5 }} useFlexGap flexWrap="wrap">
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
          {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
        </Box>
        {controls}
      </Stack>
      {loading ? <Typography color="text.secondary" sx={{ py: 10, textAlign: 'center' }}>Loading…</Typography>
        : empty ? <Typography color="text.secondary" sx={{ py: 10, textAlign: 'center' }}>Not enough data for these filters.</Typography>
        : children}
      {caption && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>{caption}</Typography>}
    </Paper>
  )
}
