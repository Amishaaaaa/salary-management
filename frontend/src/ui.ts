import { GRADIENTS } from './theme'

export function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

/** ISO country code -> flag emoji via regional-indicator symbols ("US" -> 🇺🇸). */
export function flag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return ''
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)))
}

const AVATAR_GRADIENTS = [GRADIENTS.indigo, GRADIENTS.pink, GRADIENTS.teal, GRADIENTS.amber,
  'linear-gradient(135deg,#8b5cf6,#ec4899)', 'linear-gradient(135deg,#0ea5e9,#6366f1)']

/** Same name always gets the same colour, so a person is recognisable across pages. */
export function avatarGradient(seed: string): string {
  let hash = 0
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
}

export function greeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  return hour < 18 ? 'Good afternoon' : 'Good evening'
}
