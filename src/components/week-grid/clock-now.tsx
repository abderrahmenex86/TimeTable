import { nowMinute, todayKey } from '@/domain/dates'
import type { DateKey, Interval } from '@/domain/types'
import { useNow } from '@/store/hooks'
import { topFor } from './metrics'

/**
 * The current time, in today's column.
 *
 * This is the only component that subscribes to a ticking clock, so the grid
 * itself does not re-render every thirty seconds.
 */
export function ClockNow({ date, window }: { date: DateKey; window: Interval }) {
  const now = useNow()

  if (todayKey(now) !== date) return null

  const minute = nowMinute(now)
  if (minute < window.start || minute > window.end) return null

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10"
      style={{ top: topFor(minute, window) }}
    >
      <div className="relative border-t-[1.5px] border-rose-pen">
        <span className="absolute -top-[4px] -left-1 size-[7px] rounded-full bg-rose-pen" />
      </div>
    </div>
  )
}
