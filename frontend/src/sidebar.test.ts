import {
  DEFAULT_WIDTH, MAX_WIDTH, MIN_WIDTH, RAIL_WIDTH, dragWidth, isCollapsed, loadWidth, nudgeWidth, saveWidth, settleWidth,
} from './sidebar'

describe('sidebar sizing', () => {
  beforeEach(() => localStorage.clear())

  it('follows the pointer while dragging, within the rail and max limits', () => {
    expect(dragWidth(300)).toBe(300)
    expect(dragWidth(10)).toBe(RAIL_WIDTH)
    expect(dragWidth(9999)).toBe(MAX_WIDTH)
  })

  it('snaps to the icon rail when released narrower than the threshold', () => {
    expect(settleWidth(120)).toBe(RAIL_WIDTH)
    expect(isCollapsed(settleWidth(120))).toBe(true)
  })

  it('never settles into an unusably narrow full sidebar', () => {
    expect(settleWidth(160)).toBe(MIN_WIDTH)
    expect(settleWidth(300)).toBe(300)
    expect(settleWidth(5000)).toBe(MAX_WIDTH)
  })

  it('opens from the rail on ArrowRight and collapses on ArrowLeft past the limit', () => {
    expect(nudgeWidth(RAIL_WIDTH, 16)).toBe(MIN_WIDTH)
    expect(nudgeWidth(MIN_WIDTH, -16)).toBe(MIN_WIDTH) // clamped, no jump to the rail on one tap
    expect(nudgeWidth(300, 16)).toBe(316)
  })

  it('persists the chosen width', () => {
    saveWidth(310)
    expect(loadWidth()).toBe(310)
  })

  it('falls back to the default for missing or corrupt saved values', () => {
    expect(loadWidth()).toBe(DEFAULT_WIDTH)
    localStorage.setItem('acme.sidebar', 'garbage')
    expect(loadWidth()).toBe(DEFAULT_WIDTH)
  })
})
