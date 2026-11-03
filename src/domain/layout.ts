import type { Interval } from './types'

/**
 * Side-by-side layout for overlapping items.
 *
 * The scheduler stops the *user* from double-booking, but nothing stops two
 * recurring rules from colliding — two lectures at 09:00 on a Monday is a valid
 * thing to type. Rather than let blocks stack on top of each other, overlapping
 * items in a day are packed into lanes and share the column width.
 */

export type Lane = {
  lane: number
  lanes: number
}

export type LaidOut<T> = Lane & { item: T }

export function layoutDay<T extends Interval>(items: T[]): LaidOut<T>[] {
  const sorted = [...items].sort(
    (a, b) => a.start - b.start || b.end - a.end,
  )

  const result: LaidOut<T>[] = []
  let cluster: LaidOut<T>[] = []
  let laneEnds: number[] = []
  let clusterEnd = Number.NEGATIVE_INFINITY

  const flush = () => {
    const lanes = Math.max(1, laneEnds.length)
    for (const entry of cluster) entry.lanes = lanes
    result.push(...cluster)
    cluster = []
    laneEnds = []
    clusterEnd = Number.NEGATIVE_INFINITY
  }

  for (const item of sorted) {
    // Nothing in the open cluster reaches this item, so it starts a new one.
    if (item.start >= clusterEnd) flush()

    let lane = laneEnds.findIndex((end) => end <= item.start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(item.end)
    } else {
      laneEnds[lane] = item.end
    }

    const entry: LaidOut<T> = { item, lane, lanes: 1 }
    cluster.push(entry)
    clusterEnd = Math.max(clusterEnd, item.end)
  }

  flush()
  return result
}
