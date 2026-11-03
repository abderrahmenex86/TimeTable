import { describe, expect, it } from 'vitest'
import { layoutDay } from './layout'

const item = (start: number, end: number) => ({ start, end })

describe('layoutDay', () => {
  it('gives a single item the full width', () => {
    const [only] = layoutDay([item(540, 630)])
    expect(only).toMatchObject({ lane: 0, lanes: 1 })
  })

  it('puts back-to-back items in the same lane', () => {
    const laid = layoutDay([item(540, 600), item(600, 660)])
    expect(laid.map((entry) => entry.lane)).toEqual([0, 0])
    expect(laid.every((entry) => entry.lanes === 1)).toBe(true)
  })

  it('splits two overlapping items into two lanes', () => {
    const laid = layoutDay([item(540, 660), item(600, 720)])
    expect(laid.map((entry) => entry.lane)).toEqual([0, 1])
    expect(laid.every((entry) => entry.lanes === 2)).toBe(true)
  })

  it('reuses a lane once it is free', () => {
    const laid = layoutDay([item(540, 600), item(560, 620), item(600, 660)])
    // The third item can share a lane with the first, not the second.
    expect(laid.map((entry) => entry.lane)).toEqual([0, 1, 0])
  })

  it('reports lanes per cluster, not per day', () => {
    const laid = layoutDay([
      item(540, 600),
      item(560, 620),
      item(900, 960),
    ])
    const last = laid.find((entry) => entry.item.start === 900)
    expect(last).toMatchObject({ lane: 0, lanes: 1 })
  })

  it('treats touching items as the same lane but a new cluster', () => {
    const laid = layoutDay([item(540, 600), item(600, 660), item(600, 700)])
    // The 540–600 block is genuinely free of both, so it keeps full width;
    // the two that start at 600 stack.
    expect(laid.map((entry) => entry.lane)).toEqual([0, 0, 1])
    expect(laid.map((entry) => entry.lanes)).toEqual([1, 2, 2])
  })

  it('handles an empty day', () => {
    expect(layoutDay([])).toEqual([])
  })

  it('is stable for identical starts, longest first', () => {
    const laid = layoutDay([item(540, 600), item(540, 660)])
    expect(laid.map((entry) => entry.item.end)).toEqual([660, 600])
  })
})
