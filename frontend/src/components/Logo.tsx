import { Box, Stack, Typography } from '@mui/material'
import PaymentsIcon from '@mui/icons-material/Payments'
import { GRADIENTS } from '../theme'

export default function Logo({ light = true, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box sx={{ width: 38, height: 38, borderRadius: '12px', background: GRADIENTS.brand, display: 'grid', placeItems: 'center', boxShadow: '0 6px 18px -4px rgba(139,92,246,.7)' }}>
        <PaymentsIcon sx={{ color: '#fff', fontSize: 22 }} />
      </Box>
      {!compact && <Box>
        <Typography fontWeight={800} lineHeight={1.1} sx={{ color: light ? '#fff' : 'text.primary', letterSpacing: '-0.01em' }}>ACME Pay</Typography>
        <Typography variant="caption" sx={{ color: light ? 'rgba(255,255,255,.6)' : 'text.secondary' }}>Salary management</Typography>
      </Box>}
    </Stack>
  )
}
