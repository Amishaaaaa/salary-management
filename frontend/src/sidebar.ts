/** Sidebar sizing rules, kept free of React so they are trivially testable. */
export const RAIL_WIDTH = 76 // icon-only
export const MIN_WIDTH = 220 // narrowest full sidebar
export const MAX_WIDTH = 380
export const DEFAULT_WIDTH = 264
const SNAP_BELOW = 150 // dragging narrower than this collapses to the rail
const KEY = 'acme.sidebar'

export const isCollapsed = (width: number) => width <= RAIL_WIDTH

/** While dragging: follow the pointer freely between the rail and the maximum. */
export const dragWidth = (x: number) => Math.min(MAX_WIDTH, Math.max(RAIL_WIDTH, Math.round(x)))

/** On release: settle into a valid state. Either the rail, or a full sidebar of at least the minimum width. */
export function settleWidth(width: number): number {
  if (width < SNAP_BELOW) return RAIL_WIDTH
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)))
}

/** Keyboard resize: arrows step by 16px, and crossing a limit snaps just like a drag release. */
export const nudgeWidth = (width: number, delta: number) =>
  isCollapsed(width) && delta > 0 ? MIN_WIDTH : settleWidth(width + delta)

export function loadWidth(): number {
  try {
    const n = Number(localStorage.getItem(KEY))
    return Number.isFinite(n) && n > 0 ? settleWidth(n) : DEFAULT_WIDTH
  } catch {
    return DEFAULT_WIDTH
  }
}

export function saveWidth(width: number) {
  try { localStorage.setItem(KEY, String(width)) } catch { /* preference only; safe to lose */ }
}
