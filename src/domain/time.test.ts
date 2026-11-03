import { describe, expect, it } from 'vitest'
import {
  formatClock,
  formatDuration,
  formatRange,
  parseClock,
} from './time'

describe('formatClock', () => {
  it('writes 24-hour times with a leading zero', () => {
    expect(formatClock(540)).toBe('09:00')
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(23 * 60 + 59)).toBe('23:59')
  })

  it('writes 12-hour times without a leading zero', () => {
    expect(formatClock(540, '12h')).toBe('9:00 AM')
    expect(formatClock(9 * 60 + 5, '12h')).toBe('9:05 AM')
    expect(formatClock(13 * 60 + 30, '12h')).toBe('1:30 PM')
  })

  it('handles the two 12-hour edge cases', () => {
    // Midnight is 12 AM, noon is 12 PM — not 0 AM or 0 PM.
    expect(formatClock(0, '12h')).toBe('12:00 AM')
    expect(formatClock(12 * 60, '12h')).toBe('12:00 PM')
    expect(formatClock(12 * 60 + 1, '12h')).toBe('12:01 PM')
    expect(formatClock(23 * 60 + 59, '12h')).toBe('11:59 PM')
  })

  it('clamps out-of-range input', () => {
    expect(formatClock(-30)).toBe('00:00')
    // 1440 is the end of the day, which wraps to midnight rather than "24:00".
    expect(formatClock(1440)).toBe('00:00')
    expect(formatClock(1500)).toBe('00:00')
    expect(formatClock(1440, '12h')).toBe('12:00 AM')
  })
})

describe('formatRange', () => {
  it('joins with an en dash in either format', () => {
    expect(formatRange(540, 630)).toBe('09:00 – 10:30')
    expect(formatRange(540, 630, '12h')).toBe('9:00 AM – 10:30 AM')
  })
})

describe('parseClock', () => {
  it('reads strict 24-hour input', () => {
    expect(parseClock('09:30')).toBe(570)
    expect(parseClock('9:05')).toBe(545)
    expect(parseClock('00:00')).toBe(0)
  })

  it('rejects nonsense', () => {
    expect(parseClock('24:00')).toBeNull()
    expect(parseClock('9:60')).toBeNull()
    expect(parseClock('half nine')).toBeNull()
  })
})

describe('formatDuration', () => {
  it('keeps hours and minutes separate', () => {
    expect(formatDuration(45)).toBe('45m')
    expect(formatDuration(120)).toBe('2h')
    expect(formatDuration(150)).toBe('2h 30m')
    expect(formatDuration(0)).toBe('0m')
  })
})
