import type { PercentileGroup } from '../api/types'

export interface RangeRow {
  name: string
  median: number
  p25: number
  p75: number
  /** [distance down to p25, distance up to p75]: the shape Recharts' ErrorBar expects. */
  whisker: [number, number]
}

/** Top N job groups by median pay, shaped for a median bar with a p25-p75 whisker. */
export function toRangeRows(groups: PercentileGroup[], limit = 12): RangeRow[] {
  return [...groups]
    .sort((a, b) => b.median - a.median)
    .slice(0, limit)
    .map((g) => ({
      name: g.group, median: g.median, p25: g.p25, p75: g.p75,
      whisker: [g.median - g.p25, g.p75 - g.median],
    }))
}

/** Plain-language reading of a gap for the caption under the chart. */
export function describeGap(gapPct: number): string {
  if (Math.abs(gapPct) < 0.5) return 'no meaningful gap'
  return gapPct > 0 ? `men paid ${gapPct}% more` : `women paid ${Math.abs(gapPct)}% more`
}
