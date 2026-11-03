import { describe, expect, it } from 'vitest'
import {
  clipToWindow,
  complementIntervals,
  intersectsAny,
  isEmpty,
  longestMinutes,
  mergeIntervals,
  overlaps,
  totalMinutes,
} from './intervals'

const at = (start: number, end: number) => ({ start, end })

describe('mergeIntervals', () => {
  it('coalesces overlaps into one range', () => {
    expect(mergeIntervals([at(600, 660), at(630, 690)])).toEqual([at(600, 690)])
  })

  it('coalesces touching ranges', () => {
    // Back-to-back classes must not leave a zero-length gap between them.
    expect(mergeIntervals([at(540, 600), at(600, 660)])).toEqual([at(540, 660)])
  })

  it('keeps genuine gaps apart', () => {
    expect(mergeIntervals([at(540, 600), at(610, 660)])).toEqual([
      at(540, 600),
      at(610, 660),
    ])
  })

  it('sorts unordered input', () => {
    expect(mergeIntervals([at(700, 720), at(500, 520)])).toEqual([
      at(500, 520),
      at(700, 720),
    ])
  })

  it('drops degenerate and negative ranges', () => {
    expect(mergeIntervals([at(600, 600), at(700, 650)])).toEqual([])
  })

  it('does not mutate its input', () => {
    const input = [at(600, 660)]
    mergeIntervals(input)
    expect(input).toEqual([at(600, 660)])
  })
})

describe('complementIntervals', () => {
  const day = at(480, 1380)

  it('returns the whole window when nothing is booked', () => {
    expect(complementIntervals([], day)).toEqual([day])
  })

  it('returns gaps either side of one booking', () => {
    expect(complementIntervals([at(540, 630)], day)).toEqual([
      at(480, 540),
      at(630, 1380),
    ])
  })

  it('omits a leading gap that would be zero-length', () => {
    expect(complementIntervals([at(480, 540)], day)).toEqual([at(540, 1380)])
  })

  it('omits a trailing gap that ends exactly at the window edge', () => {
    expect(complementIntervals([at(1200, 1380)], day)).toEqual([at(480, 1200)])
  })

  it('returns nothing when the window is fully covered', () => {
    expect(complementIntervals([at(400, 1500)], day)).toEqual([])
  })

  it('clips bookings that hang outside the window', () => {
    expect(complementIntervals([at(0, 500), at(1300, 1440)], day)).toEqual([
      at(500, 1300),
    ])
  })

  it('ignores bookings entirely outside the window', () => {
    expect(complementIntervals([at(0, 100), at(1400, 1440)], day)).toEqual([day])
  })

  it('merges overlapping bookings before subtracting', () => {
    expect(complementIntervals([at(540, 660), at(600, 720)], day)).toEqual([
      at(480, 540),
      at(720, 1380),
    ])
  })

  it('handles an empty window', () => {
    expect(complementIntervals([], at(600, 600))).toEqual([])
    expect(complementIntervals([], at(700, 600))).toEqual([])
  })
})

describe('overlaps', () => {
  it('treats touching ranges as not overlapping', () => {
    expect(overlaps(at(540, 600), at(600, 660))).toBe(false)
  })

  it('detects real overlap in either direction', () => {
    expect(overlaps(at(540, 600), at(590, 660))).toBe(true)
    expect(overlaps(at(590, 660), at(540, 600))).toBe(true)
  })

  it('detects containment', () => {
    expect(overlaps(at(540, 700), at(560, 600))).toBe(true)
  })
})

describe('intersectsAny', () => {
  it('is false for an empty list', () => {
    expect(intersectsAny(at(540, 600), [])).toBe(false)
  })

  it('finds a single collision among many', () => {
    expect(intersectsAny(at(540, 600), [at(0, 100), at(660, 700)])).toBe(false)
    expect(intersectsAny(at(540, 600), [at(0, 100), at(580, 700)])).toBe(true)
  })
})

describe('clipToWindow', () => {
  it('returns the intersection', () => {
    expect(clipToWindow(at(400, 700), at(480, 1380))).toEqual(at(480, 700))
  })

  it('returns null when disjoint', () => {
    expect(clipToWindow(at(0, 400), at(480, 1380))).toBeNull()
  })
})

describe('aggregates', () => {
  it('counts merged minutes once', () => {
    expect(totalMinutes([at(540, 660), at(600, 720)])).toBe(180)
  })

  it('finds the longest single range', () => {
    expect(longestMinutes([at(540, 600), at(700, 800)])).toBe(100)
  })

  it('reports emptiness', () => {
    expect(isEmpty(at(600, 600))).toBe(true)
    expect(isEmpty(at(600, 601))).toBe(false)
  })
})
