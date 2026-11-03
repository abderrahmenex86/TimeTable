import type { Interval } from '@/domain/types'

/** One hour of the grid. 56px keeps a 15-hour day inside a scrollable page. */
export const HOUR_HEIGHT = 56
export const PIXELS_PER_MINUTE = HOUR_HEIGHT / 60
export const GUTTER_WIDTH = 56

/** `56px` gutter + seven equal day columns. Referenced literally so Tailwind
 *  can see the class at build time. */
export const GRID_COLUMNS = 'grid-cols-[56px_repeat(7,minmax(0,1fr))]'

export function topFor(minute: number, window: Interval): number {
  return (minute - window.start) * PIXELS_PER_MINUTE
}

export function heightFor(start: number, end: number): number {
  return (end - start) * PIXELS_PER_MINUTE
}

/** Pointer offset inside a day column → minute of day. Used by drag and drop. */
export function minuteForOffset(offsetPx: number, window: Interval): number {
  return window.start + offsetPx / PIXELS_PER_MINUTE
}
