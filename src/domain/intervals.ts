import type { Interval } from './types'

/**
 * Interval algebra.
 *
 * All ranges are half-open: `[start, end)`. A class ending at 10:30 and one
 * starting at 10:30 do not overlap, which is what makes back-to-back sessions
 * work without special-casing.
 *
 * Everything else in the app — free-time display, drop validation, scheduling
 * suggestions — is composition on top of `mergeIntervals` and
 * `complementIntervals`.
 */

export function isEmpty(interval: Interval): boolean {
  return interval.end <= interval.start
}

/** Sorts, drops degenerate ranges, and coalesces touching or overlapping ones. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals
    .filter((interval) => !isEmpty(interval))
    .map((interval) => ({ start: interval.start, end: interval.end }))
    .sort((a, b) => a.start - b.start || a.end - b.end)

  const merged: Interval[] = []
  for (const current of sorted) {
    const last = merged[merged.length - 1]
    if (last && current.start <= last.end) {
      last.end = Math.max(last.end, current.end)
    } else {
      merged.push(current)
    }
  }
  return merged
}

/** Intersection, or `null` when the two do not touch. */
export function clipToWindow(
  interval: Interval,
  window: Interval,
): Interval | null {
  const start = Math.max(interval.start, window.start)
  const end = Math.min(interval.end, window.end)
  return end > start ? { start, end } : null
}

/**
 * The gaps inside `window` that `busy` does not cover.
 *
 * Busy intervals are clipped to the window first, so a class running past
 * midnight cannot produce a negative gap or a phantom one.
 */
export function complementIntervals(
  busy: Interval[],
  window: Interval,
): Interval[] {
  if (isEmpty(window)) return []

  const clipped = busy
    .map((interval) => clipToWindow(interval, window))
    .filter((interval): interval is Interval => interval !== null)

  const gaps: Interval[] = []
  let cursor = window.start

  for (const interval of mergeIntervals(clipped)) {
    if (interval.start > cursor) {
      gaps.push({ start: cursor, end: interval.start })
    }
    cursor = Math.max(cursor, interval.end)
    if (cursor >= window.end) break
  }

  if (cursor < window.end) {
    gaps.push({ start: cursor, end: window.end })
  }

  return gaps
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end
}

export function intersectsAny(target: Interval, others: Interval[]): boolean {
  return others.some((other) => overlaps(target, other))
}

export function totalMinutes(intervals: Interval[]): number {
  return mergeIntervals(intervals).reduce(
    (sum, interval) => sum + (interval.end - interval.start),
    0,
  )
}

/** Longest single interval, or 0 for an empty list. */
export function longestMinutes(intervals: Interval[]): number {
  return intervals.reduce(
    (longest, interval) => Math.max(longest, interval.end - interval.start),
    0,
  )
}
