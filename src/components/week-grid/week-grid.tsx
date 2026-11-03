import { useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { todayKey, weekdayOf } from '@/domain/dates'
import { busyIntervals } from '@/domain/free-time'
import { complementIntervals } from '@/domain/intervals'
import { layoutDay, type LaidOut } from '@/domain/layout'
import { formatClock, type TimeFormat } from '@/domain/time'
import {
  WEEKDAY_LABELS,
  type DateKey,
  type Interval,
  type Occurrence,
  type Subject,
  type Task,
  type TaskBlock,
} from '@/domain/types'
import { cn } from '@/lib/utils'
import { useDayWindow, useTimeFormat, useWeek } from '@/store/hooks'
import { useTimetable } from '@/store/timetable-store'
import { EntryBlock, SKETCH_RADIUS, StudyBlock } from './blocks'
import { ClockNow } from './clock-now'
import { FreeGaps } from './free-gaps'
import { GRID_COLUMNS, HOUR_HEIGHT, PIXELS_PER_MINUTE, topFor } from './metrics'


export type DropPreview = { date: DateKey; start: number; end: number }

type DayItem =
  | { kind: 'entry'; start: number; end: number; occurrence: Occurrence }
  | { kind: 'task'; start: number; end: number; block: TaskBlock; task: Task }

type DayLayout = { date: DateKey; items: LaidOut<DayItem>[] }

export function WeekGrid({
  onSelectEntry,
  onSelectTask,
  onRemoveBlock,
  preview,
}: {
  onSelectEntry?: (entryId: string) => void
  onSelectTask?: (taskId: string) => void
  onRemoveBlock?: (blockId: string) => void
  preview?: DropPreview | null
}) {
  const { dates, occurrences } = useWeek()
  const subjects = useTimetable((state) => state.subjects)
  const tasks = useTimetable((state) => state.tasks)
  const blocks = useTimetable((state) => state.blocks)
  const showFreeTime = useTimetable((state) => state.showFreeTime)
  const window = useDayWindow()
  const timeFormat = useTimeFormat()

  const today = todayKey()

  const subjectsById = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  )
  const tasksById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  )

  const days = useMemo<DayLayout[]>(
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
      let hour = Math.floor(window.start / 60) + 1;
      hour * 60 < window.end;
      hour += 1
    ) {
      list.push(hour)
    }
    // A window shorter than two hours would otherwise render no labels at all.
    if (list.length === 0) list.push(Math.floor(window.start / 60))
    return list
  }, [window])

  const totalHeight = (window.end - window.start) * PIXELS_PER_MINUTE

  // Free gaps are only computed while the overlay is on.
  const freeByDate = useMemo(() => {
    const map = new Map<DateKey, Interval[]>()
    if (!showFreeTime) return map
    for (const date of dates) {
      map.set(
        date,
        complementIntervals(busyIntervals(date, occurrences, blocks), window),
      )
    }
    return map
  }, [showFreeTime, dates, occurrences, blocks, window])

  // Hour rules live on each column's own background rather than in a shared
  // overlay, so the "today" tint and the rules can coexist without z-index
  // juggling.
  const hourRules = `repeating-linear-gradient(to bottom, transparent 0 ${
    HOUR_HEIGHT - 1
  }px, var(--color-rule-soft) ${HOUR_HEIGHT - 1}px ${HOUR_HEIGHT}px)`

  return (
    <div className="app-scroll paper-dots flex-1 overflow-auto overscroll-contain">
      <div className="min-w-[740px]">
        <div
          className={cn(
            'sticky top-0 z-20 grid h-14 border-b border-rule bg-paper-raised',
            GRID_COLUMNS,
          )}
        >
          <div />
          {days.map(({ date }) => (
            <DayHeader key={date} date={date} isToday={date === today} />
          ))}
        </div>

        <div className={cn('grid', GRID_COLUMNS)} style={{ height: totalHeight }}>
          <TimeGutter hours={hours} window={window} timeFormat={timeFormat} />

          {days.map(({ date, items }) => (
            <DayColumn
              key={date}
              date={date}
              isToday={date === today}
              items={items}
              hourRules={hourRules}
              subjectsById={subjectsById}
              freeGaps={freeByDate.get(date) ?? []}
              window={window}
              preview={preview}
              timeFormat={timeFormat}
              onSelectEntry={onSelectEntry}
              onSelectTask={onSelectTask}
              onRemoveBlock={onRemoveBlock}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

type DayColumnProps = {
  date: DateKey
  isToday: boolean
  items: LaidOut<DayItem>[]
  hourRules: string
  subjectsById: Map<string, Subject>
  freeGaps: Interval[]
  window: Interval
  timeFormat: TimeFormat
  preview?: DropPreview | null
  onSelectEntry?: (entryId: string) => void
  onSelectTask?: (taskId: string) => void
  onRemoveBlock?: (blockId: string) => void
}

function DayColumn({
  date,
  isToday,
  items,
  hourRules,
  subjectsById,
  freeGaps,
  window,
  timeFormat,
  preview,
  onSelectEntry,
  onSelectTask,
  onRemoveBlock,
}: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: date, data: { date } })
  const ghost = preview?.date === date ? preview : null

  return (
    <div
      ref={setNodeRef}
      data-date={date}
      className={cn(
        'relative border-l border-rule-soft',
        isToday && 'bg-butter-fill/30',
        isOver && 'bg-sky-fill/25',
      )}
      style={{ backgroundImage: hourRules }}
    >
      {freeGaps.length > 0 ? <FreeGaps gaps={freeGaps} window={window} /> : null}

      {items.map(({ item, lane, lanes }) =>
        item.kind === 'entry' ? (
          <EntryBlock
            key={`${item.occurrence.entryId}-${item.occurrence.date}`}
            occurrence={item.occurrence}
            color={subjectsById.get(item.occurrence.subjectId)?.color}
            lane={lane}
            lanes={lanes}
            window={window}
            timeFormat={timeFormat}
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
            window={window}
            timeFormat={timeFormat}
            onEdit={
              onSelectTask ? () => onSelectTask(item.task.id) : undefined
            }
            onRemove={
              onRemoveBlock ? () => onRemoveBlock(item.block.id) : undefined
            }
          />
        ),
      )}

      {ghost ? (
        <div
          className="pointer-events-none absolute inset-x-[2px] z-20 border-[1.5px] border-dashed border-sky-pen bg-sky-fill/60"
          style={{
            top: topFor(ghost.start, window),
            height: Math.max((ghost.end - ghost.start) * PIXELS_PER_MINUTE - 2, 14),
            borderRadius: SKETCH_RADIUS,
          }}
        >
          <span
            className="absolute inset-x-0 top-0.5 text-center text-[0.6rem] tabular-nums text-sky-pen"
            data-num
          >
            {formatClock(ghost.start)}
          </span>
        </div>
      ) : null}

      <ClockNow date={date} window={window} />
    </div>
  )
}

function DayHeader({ date, isToday }: { date: DateKey; isToday: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center border-l border-rule-soft px-2">
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
          'mt-1 block h-[1.5px] w-5',
          isToday ? 'bg-rose-pen' : 'bg-transparent',
        )}
      />
    </div>
  )
}

function TimeGutter({
  hours,
  window,
  timeFormat,
}: {
  hours: number[]
  window: Interval
  timeFormat: TimeFormat
}) {
  return (
    <div className="relative">
      {hours.map((hour) => (
        <span
          key={hour}
          className={cn(
            'absolute right-2 text-[0.62rem] tabular-nums text-ink-40',
            hour * 60 === window.start ? '' : '-translate-y-1/2',
          )}
          style={{ top: topFor(hour * 60, window) + (hour * 60 === window.start ? 2 : 0) }}
          data-num
        >
          {formatClock(hour * 60, timeFormat)}
        </span>
      ))}
    </div>
  )
}
