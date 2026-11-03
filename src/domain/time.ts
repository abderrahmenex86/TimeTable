import type { Minute } from './types'

export const MINUTES_PER_HOUR = 60
export const MINUTES_PER_DAY = 24 * 60

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

/** `570` → `"09:30"`. */
export function formatClock(minute: Minute): string {
  const safe = clampMinute(minute)
  return `${pad(Math.floor(safe / MINUTES_PER_HOUR))}:${pad(safe % MINUTES_PER_HOUR)}`
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
export function formatRange(start: Minute, end: Minute): string {
  return `${formatClock(start)} – ${formatClock(end)}`
}

export function durationOf(interval: { start: Minute; end: Minute }): number {
  return Math.max(0, interval.end - interval.start)
}
