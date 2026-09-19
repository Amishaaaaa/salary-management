import type { PercentileGroup } from '../api/types'
import { describeGap, toRangeRows } from './transform'

const g = (group: string, median: number, p25: number, p75: number): PercentileGroup =>
  ({ group, count: 10, min: 0, p25, median, p75, max: 0, mean: median })

describe('toRangeRows', () => {
  it('sorts by median desc and computes whisker distances', () => {
    const rows = toRangeRows([g('A', 100, 80, 130), g('B', 200, 150, 260)])
    expect(rows.map((r) => r.name)).toEqual(['B', 'A'])
    expect(rows[1].whisker).toEqual([20, 30])
  })

  it('limits the number of rows', () => {
    const many = Array.from({ length: 20 }, (_, i) => g(`G${i}`, i, i, i))
    expect(toRangeRows(many, 5)).toHaveLength(5)
  })
})

describe('describeGap', () => {
  it('describes direction and size', () => {
    expect(describeGap(3.1)).toBe('men paid 3.1% more')
    expect(describeGap(-2)).toBe('women paid 2% more')
    expect(describeGap(0.2)).toBe('no meaningful gap')
  })
})
