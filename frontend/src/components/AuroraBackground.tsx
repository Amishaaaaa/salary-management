import { Box } from '@mui/material'
import { useEffect, useMemo, useRef } from 'react'

interface Props {
  /** 'login' = bold, dark and glowing. 'app' = softer wash that follows the light/dark theme. */
  variant: 'login' | 'app'
  mode?: 'light' | 'dark'
}

// Deterministic (no Math.random) so the layout is identical every render and React never repaints it.
const PARTICLES = Array.from({ length: 46 }, (_, i) => ({
  left: (i * 47 + 11) % 100,
  size: 2 + ((i * 5) % 5),
  duration: 11 + ((i * 7) % 15),
  delay: -((i * 3.7) % 20),
}))
const TWINKLES = Array.from({ length: 34 }, (_, i) => ({
  left: (i * 29 + 7) % 100, top: (i * 53 + 13) % 100, size: 1 + (i % 3), delay: -((i * 1.3) % 6), duration: 2.5 + (i % 4),
}))
const CURTAINS = [
  { left: '6%', width: '20vw', c: 'rgba(99,102,241,.55)', c2: 'rgba(56,189,248,.35)', d: 12, delay: 0 },
  { left: '30%', width: '16vw', c: 'rgba(168,85,247,.5)', c2: 'rgba(236,72,153,.35)', d: 15, delay: -4 },
  { left: '54%', width: '22vw', c: 'rgba(20,184,166,.4)', c2: 'rgba(99,102,241,.4)', d: 17, delay: -8 },
  { left: '78%', width: '18vw', c: 'rgba(236,72,153,.5)', c2: 'rgba(139,92,246,.4)', d: 14, delay: -2 },
]
// One period of a smooth wave; drawn twice side by side so translating by -50% loops seamlessly.
const WAVE = 'M0,90 C240,30 480,150 720,90 C960,30 1200,150 1440,90 C1680,30 1920,150 2160,90 C2400,30 2640,150 2880,90 L2880,200 L0,200 Z'
const WAVES = [
  { fill: 'url(#wv1)', d: 26, top: 0.55 }, { fill: 'url(#wv2)', d: 19, top: 0.8 }, { fill: 'url(#wv3)', d: 13, top: 1 },
]
const FLOWS = [
  { d: 'M-50,620 C300,420 520,760 860,520 S1260,300 1500,420', c: '#818cf8', dur: 11, delay: 0, w: 2.5 },
  { d: 'M-50,300 C260,120 560,420 900,240 S1300,60 1500,180', c: '#f472b6', dur: 14, delay: -5, w: 2 },
  { d: 'M-50,760 C340,640 640,860 1000,700 S1320,560 1500,640', c: '#38bdf8', dur: 16, delay: -9, w: 2 },
  { d: 'M-50,470 C280,560 620,300 940,430 S1240,610 1500,500', c: '#c084fc', dur: 12.5, delay: -3, w: 1.6 },
]
const STREAKS = [
  { top: '8%', left: '96%', delay: 0 }, { top: '30%', left: '104%', delay: -3.5 }, { top: '2%', left: '70%', delay: -6.5 },
]

/** Decorative only: aria-hidden, no pointer events, sits behind everything. */
export default function AuroraBackground({ variant, mode = 'light' }: Props) {
  const login = variant === 'login'
  const dark = login || mode === 'dark'
  const alpha = login ? 0.78 : dark ? 0.4 : 0.36
  const root = useRef<HTMLDivElement>(null)

  // Parallax: the colour layer follows the cursor a few pixels. rAF-throttled, and skipped for reduced motion.
  useEffect(() => {
    const el = root.current
    if (!el || !login || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const move = (e: MouseEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--mx', String((e.clientX / window.innerWidth - 0.5) * -2))
        el.style.setProperty('--my', String((e.clientY / window.innerHeight - 0.5) * -2))
      })
    }
    window.addEventListener('mousemove', move)
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(frame) }
  }, [login])

  const blobs = useMemo(() => [
    { cls: 'aurora-a', color: `rgba(99,102,241,${alpha})`, size: '46vmax', top: '-14%', left: '-8%' },
    { cls: 'aurora-b', color: `rgba(236,72,153,${alpha})`, size: '40vmax', top: '30%', left: '58%' },
    { cls: 'aurora-c', color: `rgba(14,165,233,${alpha * 0.9})`, size: '36vmax', top: '62%', left: '8%' },
    { cls: 'aurora-a', color: `rgba(139,92,246,${alpha})`, size: '34vmax', top: '-10%', left: '62%' },
    { cls: 'aurora-b', color: `rgba(20,184,166,${alpha * 0.7})`, size: '30vmax', top: '70%', left: '52%' },
    { cls: 'aurora-c', color: `rgba(249,115,22,${alpha * 0.55})`, size: '26vmax', top: '40%', left: '28%' },
  ], [alpha])

  return (
    <Box ref={root} aria-hidden sx={{
      position: login ? 'absolute' : 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
      background: login ? 'linear-gradient(135deg, #0f0c29 0%, #1e1b4b 45%, #24123f 100%)' : dark ? '#0b0f1e' : '#f4f5fb',
    }}>
      <div className="aurora-parallax">
        {blobs.map((b, i) => (
          <Box key={i} className={`aurora-blob ${b.cls}`}
            sx={{ width: b.size, height: b.size, top: b.top, left: b.left, background: `radial-gradient(circle at 50% 50%, ${b.color}, transparent 68%)` }} />
        ))}
      </div>
      {login && (
        <>
          {CURTAINS.map((c, i) => (
            <div key={i} className="aurora-curtain" style={{ left: c.left, width: c.width, animationDuration: `${c.d}s`, animationDelay: `${c.delay}s`, ['--c' as string]: c.c, ['--c2' as string]: c.c2 }} />
          ))}
          <div className="aurora-beam" />
          <svg className="aurora-flow" viewBox="0 0 1440 900" preserveAspectRatio="none">
            {FLOWS.map((f, i) => (
              <path key={i} d={f.d} stroke={f.c} strokeWidth={f.w} opacity={0.5} style={{ ['--d' as string]: `${f.dur}s`, animationDelay: `${f.delay}s` }} />
            ))}
          </svg>
          <Box className="aurora-glow" sx={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)', backgroundSize: '56px 56px', maskImage: 'radial-gradient(ellipse at 50% 40%, #000 25%, transparent 75%)' }} />
          {TWINKLES.map((t, i) => (
            <span key={i} className="aurora-twinkle" style={{ left: `${t.left}%`, top: `${t.top}%`, width: t.size, height: t.size, animationDelay: `${t.delay}s`, animationDuration: `${t.duration}s` }} />
          ))}
          <div className="aurora-waves">
            <svg width="0" height="0" style={{ position: 'absolute' }}>
              <defs>
                <linearGradient id="wv1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6366f1" stopOpacity=".38" /><stop offset="1" stopColor="#6366f1" stopOpacity=".05" /></linearGradient>
                <linearGradient id="wv2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a855f7" stopOpacity=".42" /><stop offset="1" stopColor="#a855f7" stopOpacity=".06" /></linearGradient>
                <linearGradient id="wv3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ec4899" stopOpacity=".5" /><stop offset="1" stopColor="#ec4899" stopOpacity=".08" /></linearGradient>
              </defs>
            </svg>
            {WAVES.map((w, i) => (
              <svg key={i} className="aurora-wave" viewBox="0 0 2880 200" preserveAspectRatio="none" style={{ ['--d' as string]: `${w.d}s`, height: `${w.top * 100}%`, opacity: 0.95 }}>
                <path d={WAVE} fill={w.fill} />
              </svg>
            ))}
          </div>
          {STREAKS.map((s, i) => (
            <span key={i} className="aurora-streak" style={{ top: s.top, left: s.left, animationDelay: `${s.delay}s` }} />
          ))}
          {PARTICLES.map((p, i) => (
            <span key={i} className="aurora-particle" style={{ left: `${p.left}%`, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }} />
          ))}
        </>
      )}
    </Box>
  )
}
