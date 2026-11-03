import { useMemo } from 'react'
import { todayKey, weekdayOf } from '@/domain/dates'
import { DEFAULT_DAY_WINDOW } from '@/domain/free-time'
import { layoutDay } from '@/domain/layout'
import { formatClock } from '@/domain/time'
import {
  WEEKDAY_LABELS,
  type DateKey,
  type Interval,
  type Occurrence,
  type Task,
  type TaskBlock,
} from '@/domain/types'
import { cn } from '@/lib/utils'
import { useWeek } from '@/store/hooks'
import { useTimetable } from '@/store/timetable-store'
import { EntryBlock, StudyBlock } from './blocks'
import { ClockNow } from './clock-now'
import { FreeGaps } from './free-gaps'
import {
  GRID_COLUMNS,
  HOUR_HEIGHT,
  PIXELS_PER_MINUTE,
  topFor,
} from './metrics'
import { complementIntervals } from '@/domain/intervals'
import { busyIntervals } from '@/domain/free-time'

const WINDOW = DEFAULT_DAY_WINDOW

type DayItem =
  | { kind: 'entry'; start: number; end: number; occurrence: Occurrence }
  | { kind: 'task'; start: number; end: number; block: TaskBlock; task: Task }

/**
 * The week.
 *
 * Rules are expanded by `useWeek`, then each day's occurrence and task blocks
 * are merged into one list and laid out into lanes before anything is drawn —
 * so two commitments that collide share the column instead of hiding one
 * another.
 */
export function WeekGrid({
  onSelectEntry,
}: {
  onSelectEntry?: (entryId: string) => void
}) {
  const { dates, occurrences } = useWeek()
  const subjects = useTimetable((state) => state.subjects)
  const tasks = useTimetable((state) => state.tasks)
  const blocks = useTimetable((state) => state.blocks)
  const showFreeTime = useTimetable((state) => state.showFreeTime)

  const today = todayKey()

  const subjectsById = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  )
  const tasksById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  )

  const days = useMemo(
    () =>
      dates.map((date) => {
        const items: DayItem[] = []

        for (const occurrence of occurrences) {
          if (occurrence.date !== date) continue
          items.push({
            kind: 'entry',
            start: occurrence.start,
            end: occurrence.end,
            occurrence,
          })
        }

        for (const block of blocks) {
          if (block.date !== date) continue
          const task = tasksById.get(block.taskId)
          if (!task) continue
          items.push({ kind: 'task', start: block.start, end: block.end, block, task })
        }

        return { date, items: layoutDay(items) }
      }),
    [dates, occurrences, blocks, tasksById],
  )

  const hours = useMemo(() => {
    const list: number[] = []
    // Start one hour below the window top so the first label is not clipped by
    // the header, and stop before the bottom edge for the same reason.
    for (
      let hour = Math.floor(WINDOW.start / 60) + 1;
      hour * 60 < WINDOW.end;
      hour += 1
    ) {
      list.push(hour)
    }
    return list
  }, [])

  const totalHeight = (WINDOW.end - WINDOW.start) * PIXELS_PER_MINUTE

  // Free gaps are only computed while the overlay is on — this is the one place
  // the grid pays for interval maths, so it should not pay for it twice.
  const freeByDate = useMemo(() => {
    const map = new Map<DateKey, Interval[]>()
    if (!showFreeTime) return map
    for (const date of dates) {
      map.set(date, complementIntervals(busyIntervals(date, occurrences, blocks), WINDOW))
    }
    return map
  }, [showFreeTime, dates, occurrences, blocks])

  // Hour rules live on each column's own background rather than in a shared
  // overlay, so the "today" tint and the rules can coexist without z-index
  // juggling.
  const hourRules = `repeating-linear-gradient(to bottom, transparent 0 ${
    HOUR_HEIGHT - 1
  }px, var(--color-rule-soft) ${HOUR_HEIGHT - 1}px ${HOUR_HEIGHT}px)`

  return (
    <div className="flex-1 overflow-auto overscroll-contain">
      <div className="min-w-[740px]">
        <div
          className={cn(
            'sticky top-0 z-20 grid border-b border-rule bg-paper',
            GRID_COLUMNS,
          )}
        >
          <div />
          {days.map(({ date }) => (
            <DayHeader key={date} date={date} isToday={date === today} />
          ))}
        </div>

        <div className={cn('grid', GRID_COLUMNS)} style={{ height: totalHeight }}>
          <TimeGutter hours={hours} window={WINDOW} />

          {days.map(({ date, items }) => (
            <div
              key={date}
              className={cn(
                'relative border-l border-rule-soft',
                date === today && 'bg-butter-fill/30',
              )}
              style={{ backgroundImage: hourRules }}
            >
              {showFreeTime ? (
                <FreeGaps gaps={freeByDate.get(date) ?? []} window={WINDOW} />
              ) : null}

              {items.map(({ item, lane, lanes }) =>
                item.kind === 'entry' ? (
                  <EntryBlock
                    key={`${item.occurrence.entryId}-${item.occurrence.date}`}
                    occurrence={item.occurrence}
                    color={subjectsById.get(item.occurrence.subjectId)?.color}
                    lane={lane}
                    lanes={lanes}
                    window={WINDOW}
                    onSelect={
                      onSelectEntry
                        ? () => onSelectEntry(item.occurrence.entryId)
                        : undefined
                    }
                  />
                ) : (
                  <StudyBlock
                    key={item.block.id}
                    block={item.block}
                    task={item.task}
                    color={subjectsById.get(item.task.subjectId ?? '')?.color}
                    lane={lane}
                    lanes={lanes}
                    window={WINDOW}
                  />
                ),
              )}

              <ClockNow date={date} window={WINDOW} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DayHeader({ date, isToday }: { date: DateKey; isToday: boolean }) {
  return (
    <div className="border-l border-rule-soft px-2 py-2 text-center">
      <p className="text-[0.6rem] uppercase tracking-[0.16em] text-ink-40">
        {WEEKDAY_LABELS[weekdayOf(date)]}
      </p>
      <p
        className={cn(
          'mt-0.5 font-hand text-[1.15rem] leading-none tabular-nums',
          isToday ? 'text-rose-pen' : 'text-ink',
        )}
        data-num
      >
        {Number(date.slice(8))}
      </p>
      <span
        className={cn(
          'mx-auto mt-1 block h-[1.5px] w-5',
          isToday ? 'bg-rose-pen' : 'bg-transparent',
        )}
      />
    </div>
  )
}

function TimeGutter({
  hours,
  window,
}: {
  hours: number[]
  window: Interval
}) {
  return (
    <div className="relative">
      {hours.map((hour) => (
        <span
          key={hour}
          className="absolute right-2 -translate-y-1/2 text-[0.62rem] tabular-nums text-ink-40"
          style={{ top: topFor(hour * 60, window) }}
          data-num
        >
          {formatClock(hour * 60)}
        </span>
      ))}
    </div>
  )
}
