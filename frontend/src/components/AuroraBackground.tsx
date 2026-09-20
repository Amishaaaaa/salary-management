import { Box } from '@mui/material'
import { useMemo } from 'react'

interface Props {
  /** 'login' = bold, dark and glowing. 'app' = soft wash that follows the light/dark theme. */
  variant: 'login' | 'app'
  mode?: 'light' | 'dark'
}

// Deterministic particles (no Math.random): the same layout every render, so React never re-paints them.
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 47 + 11) % 100,
  size: 2 + ((i * 5) % 5),
  duration: 14 + ((i * 7) % 16),
  delay: -((i * 3.7) % 20),
}))

/** Decorative only: aria-hidden, no pointer events, sits behind everything. */
export default function AuroraBackground({ variant, mode = 'light' }: Props) {
  const login = variant === 'login'
  const dark = login || mode === 'dark'
  const alpha = login ? 0.75 : dark ? 0.38 : 0.34

  const blobs = useMemo(() => [
    { cls: 'aurora-a', color: `rgba(99,102,241,${alpha})`, size: '46vmax', top: '-14%', left: '-8%' },
    { cls: 'aurora-b', color: `rgba(236,72,153,${alpha})`, size: '40vmax', top: '30%', left: '58%' },
    { cls: 'aurora-c', color: `rgba(14,165,233,${alpha * 0.9})`, size: '36vmax', top: '62%', left: '8%' },
    { cls: 'aurora-a', color: `rgba(139,92,246,${alpha})`, size: '34vmax', top: '-10%', left: '62%' },
  ], [alpha])

  return (
    <Box aria-hidden sx={{
      position: login ? 'absolute' : 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
      background: login
        ? 'linear-gradient(135deg, #0f0c29 0%, #1e1b4b 45%, #24123f 100%)'
        : dark ? '#0b0f1e' : '#f4f5fb',
    }}>
      {blobs.map((b, i) => (
        <Box key={i} className={`aurora-blob ${b.cls}`}
          sx={{ width: b.size, height: b.size, top: b.top, left: b.left, background: `radial-gradient(circle at 50% 50%, ${b.color}, transparent 68%)` }} />
      ))}
      {login && (
        <>
          {/* faint grid + vignette gives depth instead of a flat gradient */}
          <Box className="aurora-glow" sx={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)', backgroundSize: '56px 56px', maskImage: 'radial-gradient(ellipse at 50% 40%, #000 25%, transparent 75%)' }} />
          {PARTICLES.map((p, i) => (
            <span key={i} className="aurora-particle" style={{ left: `${p.left}%`, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }} />
          ))}
        </>
      )}
    </Box>
  )
}
