import type { CSSProperties } from 'react'
import type { SubjectColor } from '@/domain/types'

/**
 * Maps a stored colour token onto CSS custom properties.
 *
 * The pastel fill and its paired pen tone both live in `index.css`, so a
 * subject is a name like `'sage'` rather than a hex value that would have to be
 * migrated if the palette changed.
 */
export function subjectVars(color?: SubjectColor): CSSProperties {
  if (!color) {
    return {
      '--subject-fill': 'var(--color-paper-sunk)',
      '--subject-pen': 'var(--color-ink-60)',
    } as CSSProperties
  }

  return {
    '--subject-fill': `var(--color-${color}-fill)`,
    '--subject-pen': `var(--color-${color}-pen)`,
  } as CSSProperties
}
