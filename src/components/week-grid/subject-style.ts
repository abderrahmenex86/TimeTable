import type { CSSProperties } from 'react'
import type { SubjectColor } from '@/domain/types'

/**
 * Maps a stored colour token onto CSS custom properties.
 *
 * Each subject is a `fill`/`pen` pair defined per theme in `index.css`, so the
 * blocks re-colour themselves in dark mode without any JavaScript involvement.
 * The token names are composed at runtime, which is why these reference the
 * raw variables (`--sage-fill`) rather than Tailwind's `--color-*` aliases.
 */
export function subjectVars(color?: SubjectColor): CSSProperties {
  if (!color) {
    return {
      '--subject-fill': 'var(--surface-sunk)',
      '--subject-pen': 'var(--fg-60)',
    } as CSSProperties
  }

  return {
    '--subject-fill': `var(--${color}-fill)`,
    '--subject-pen': `var(--${color}-pen)`,
  } as CSSProperties
}
