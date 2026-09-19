import { formatMoney, formatUsd, formatUsdCompact } from './format'
import { ApiError, fieldErrors, toQueryString } from './api/client'

describe('formatting', () => {
  it('formats whole-unit money in the given currency', () => {
    expect(formatUsd(85000)).toBe('$85,000')
    expect(formatMoney(2500000, 'INR')).toContain('2,500,000')
  })

  it('formats compact USD for charts', () => {
    expect(formatUsdCompact(1_250_000)).toBe('$1.3M')
    expect(formatUsdCompact(95_000)).toBe('$95K')
  })
})

describe('toQueryString', () => {
  it('drops empty values and encodes the rest', () => {
    expect(toQueryString({ search: 'a b', country: '', page: 2, level: undefined })).toBe('?search=a+b&page=2')
  })

  it('returns an empty string when there is nothing to send', () => {
    expect(toQueryString({})).toBe('')
  })
})

describe('fieldErrors', () => {
  it('flattens DRF validation errors to one message per field', () => {
    const err = new ApiError(400, { salary: ['Too high.', 'Really.'], email: ['Taken.'] })
    expect(fieldErrors(err)).toEqual({ salary: 'Too high. Really.', email: 'Taken.' })
  })

  it('returns nothing for non-validation errors', () => {
    expect(fieldErrors(new Error('boom'))).toEqual({})
    expect(fieldErrors(new ApiError(500, null))).toEqual({})
  })
})
