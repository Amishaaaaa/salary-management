import { avatarGradient, flag, greeting, initials } from './ui'

describe('ui helpers', () => {
  it('builds uppercase initials', () => {
    expect(initials('ada', 'lovelace')).toBe('AL')
  })

  it('converts country codes to flag emoji', () => {
    expect(flag('US')).toBe('🇺🇸')
    expect(flag('in')).toBe('🇮🇳')
  })

  it('returns nothing for invalid country codes', () => {
    expect(flag('')).toBe('')
    expect(flag('USA')).toBe('')
  })

  it('gives the same avatar colour for the same name, every time', () => {
    expect(avatarGradient('Ada Lovelace')).toBe(avatarGradient('Ada Lovelace'))
  })

  it('greets by time of day', () => {
    expect([greeting(8), greeting(14), greeting(21)]).toEqual(['Good morning', 'Good afternoon', 'Good evening'])
  })
})
