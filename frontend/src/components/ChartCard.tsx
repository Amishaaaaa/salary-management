import { Box, Paper, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

// Categorical slot 1 of the reference palette: passes the contrast check on a white surface.
export const SERIES_COLOR = '#2a78d6'
export const INK = { primary: '#0b0b0b', secondary: '#52514e', grid: '#e4e3df' }

interface Props {
  title: string
  subtitle?: string
  controls?: ReactNode
  caption?: ReactNode
  loading?: boolean
  empty?: boolean
  children: ReactNode
}

/** Title states the question the chart answers; a single series needs no legend. */
export default function ChartCard({ title, subtitle, controls, caption, loading, empty, children }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 1 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
          {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
        </Box>
        {controls}
      </Stack>
      {loading ? <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>Loading…</Typography>
        : empty ? <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>Not enough data for these filters.</Typography>
        : children}
      {caption && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>{caption}</Typography>}
    </Paper>
  )
}
