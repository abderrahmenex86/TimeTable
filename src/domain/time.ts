import type { Minute } from './types'

export const MINUTES_PER_HOUR = 60
export const MINUTES_PER_DAY = 24 * 60

/** How clock times are written. Durations are unaffected — "2h 30m" either way. */
export type TimeFormat = '12h' | '24h'

const pad = (n: number) => (n < 10 ? `0${n}` : String(n))

/** `"09:30"` → `570`. Returns `null` for anything malformed. */
export function parseClock(value: string): Minute | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/**
 * `570` → `"09:30"` or `"9:30 AM"`.
 *
 * 12-hour output drops the leading zero on the hour, which is how people write
 * times; 24-hour keeps it so a column of times stays aligned.
 */
export function formatClock(minute: Minute, format: TimeFormat = '24h'): string {
  const safe = clampMinute(minute)
  // 1440 is midnight at the end of the day; wrap rather than printing "24:00".
  const hours = Math.floor(safe / MINUTES_PER_HOUR) % 24
  const minutes = safe % MINUTES_PER_HOUR

  if (format === '24h') return `${pad(hours)}:${pad(minutes)}`

  const suffix = hours < 12 ? 'AM' : 'PM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${pad(minutes)} ${suffix}`
}

export function clampMinute(minute: Minute): Minute {
  return Math.min(MINUTES_PER_DAY, Math.max(0, Math.round(minute)))
}

/** Snap to the nearest `step`-minute boundary. */
export function snapMinute(minute: Minute, step = 15): Minute {
  return Math.round(minute / step) * step
}

/**
 * `"2h 30m"`, `"2h"`, `"45m"`. Used for gap labels and task effort, where the
 * exact number matters more than the granularity.
 */
export function formatDuration(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes))
  const hours = Math.floor(rounded / MINUTES_PER_HOUR)
  const rest = rounded % MINUTES_PER_HOUR
  if (hours === 0) return `${rest}m`
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}m`
}

/** `"09:00 – 10:30"`. En dash, spaced, no labels — the grid provides context. */
export function formatRange(
  start: Minute,
  end: Minute,
  format: TimeFormat = '24h',
): string {
  return `${formatClock(start, format)} – ${formatClock(end, format)}`
}

export function durationOf(interval: { start: Minute; end: Minute }): number {
  return Math.max(0, interval.end - interval.start)
}
