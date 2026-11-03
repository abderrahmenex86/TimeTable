import { useMemo, useState } from 'react'
import { todayKey, weekdayOf } from '@/domain/dates'
import { formatClock, formatDuration, formatRange } from '@/domain/time'
import {
  WEEKDAY_LABELS,
  type Occurrence,
  type Task,
  type TaskBlock,
} from '@/domain/types'
import { cn } from '@/lib/utils'
import { useDayWindow, useTimeFormat, useWeek } from '@/store/hooks'
import { useTimetable } from '@/store/timetable-store'
import { subjectVars } from '@/components/week-grid/subject-style'

type Row =
  | { kind: 'gap'; start: number; end: number }
  | { kind: 'entry'; start: number; end: number; occurrence: Occurrence }
  | { kind: 'task'; start: number; end: number; block: TaskBlock; task: Task }

/**
 * The phone view is not a squeezed week. A 390px column of seven days would be
 * 40px wide, so the week becomes a day strip and the day becomes a list —
 * a different projection of exactly the same occurrences and blocks.
 */
export function DayAgenda({
  onSelectEntry,
}: {
  onSelectEntry?: (entryId: string) => void
}) {
  const { dates, occurrences } = useWeek()
  const tasks = useTimetable((state) => state.tasks)
  const blocks = useTimetable((state) => state.blocks)
  const subjects = useTimetable((state) => state.subjects)
  const showFreeTime = useTimetable((state) => state.showFreeTime)
  const window = useDayWindow()
  const timeFormat = useTimeFormat()

  const [requested, setRequested] = useState(() => todayKey())
  const today = todayKey()

  // Derive rather than sync: when the week changes, an out-of-range selection
  // falls back to today (or Monday) without an effect.
  const selected = dates.includes(requested)
    ? requested
    : dates.includes(today)
      ? today
      : dates[0]

  const subjectsById = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  )
  const tasksById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  )

  const rows = useMemo<Row[]>(() => {
    const items: Row[] = []

    for (const occurrence of occurrences) {
      if (occurrence.date !== selected) continue
      items.push({
        kind: 'entry',
        start: occurrence.start,
        end: occurrence.end,
        occurrence,
      })
    }

    for (const block of blocks) {
      if (block.date !== selected) continue
      const task = tasksById.get(block.taskId)
      if (!task) continue
      items.push({ kind: 'task', start: block.start, end: block.end, block, task })
    }

    items.sort((a, b) => a.start - b.start || a.end - b.end)

    const withGaps: Row[] = []
    let cursor = window.start
    for (const item of items) {
      if (item.start > cursor) {
        withGaps.push({ kind: 'gap', start: cursor, end: item.start })
      }
      withGaps.push(item)
      cursor = Math.max(cursor, item.end)
    }
    if (cursor < window.end) {
      withGaps.push({ kind: 'gap', start: cursor, end: window.end })
    }
    return withGaps
  }, [selected, occurrences, blocks, tasksById, window.start, window.end])

  // Gaps are only worth a row when the overlay is on; otherwise they contribute
  // an orphaned time label with nothing beside it.
  const visibleRows = showFreeTime
    ? rows
    : rows.filter((row) => row.kind !== 'gap')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-rule px-2 py-2">
        {dates.map((date) => {
          const isSelected = date === selected
          const isToday = date === today
          return (
            <button
              key={date}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${WEEKDAY_LABELS[weekdayOf(date)]} ${Number(date.slice(8))}`}
              onClick={() => setRequested(date)}
              className={cn(
                'flex min-w-[42px] flex-1 flex-col items-center border px-1 py-1.5 transition-colors',
                isSelected
                  ? 'border-sky-pen bg-sky-fill text-sky-pen'
                  : 'border-transparent text-ink-60',
              )}
              style={{ borderRadius: '8px 2px 9px 3px / 3px 9px 2px 8px' }}
            >
              <span className="text-[0.55rem] uppercase tracking-[0.14em] opacity-70">
                {WEEKDAY_LABELS[weekdayOf(date)]}
              </span>
              <span
                className={cn(
                  'mt-0.5 font-hand text-[1.05rem] leading-none tabular-nums',
                  isToday && !isSelected && 'text-rose-pen',
                )}
                data-num
              >
                {Number(date.slice(8))}
              </span>
            </button>
          )
        })}
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {visibleRows.length === 0 ? (
          <li className="px-1 py-6 text-center text-[0.8rem] text-ink-40">
            Nothing on this day. Drag a task in from the desktop view, or use
            the arrow on a task to find it a slot.
          </li>
        ) : null}

        {visibleRows.map((row) => (
          <li key={`${row.kind}-${row.start}`} className="flex items-stretch gap-2">
            <div
              className="w-10 shrink-0 pt-2 text-right text-[0.65rem] tabular-nums text-ink-40"
              data-num
            >
              {formatClock(row.start, timeFormat)}
            </div>

            <div className="min-w-0 flex-1 pb-1.5">
              {row.kind === 'gap' ? (
                <div className="border-l-[1.5px] border-dashed border-rule py-2 pl-2">
                  <span className="text-[0.66rem] text-ink-40" data-num>
                    {formatDuration(row.end - row.start)} free
                  </span>
                </div>
              ) : row.kind === 'entry' ? (
                <button
                  type="button"
                  onClick={() => onSelectEntry?.(row.occurrence.entryId)}
                  className="block w-full border-l-[2.5px] px-2 py-1.5 text-left"
                  style={{
                    ...subjectVars(
                      subjectsById.get(row.occurrence.subjectId)?.color,
                    ),
                    backgroundColor: 'var(--subject-fill)',
                    borderLeftColor: 'var(--subject-pen)',
                    color: 'var(--subject-pen)',
                    borderRadius: '6px 2px 7px 3px / 3px 7px 2px 6px',
                  }}
                >
                  <span className="block font-hand text-[0.95rem] leading-tight">
                    {row.occurrence.title}
                  </span>
                  <span
                    className="mt-0.5 block text-[0.64rem] opacity-70"
                    data-num
                  >
                    {formatRange(row.start, row.end, timeFormat)}
                    {row.occurrence.location ? ` · ${row.occurrence.location}` : ''}
                  </span>
                </button>
              ) : (
                <div
                  className="border-[1.5px] border-dashed px-2 py-1.5"
                  style={{
                    ...subjectVars(subjectsById.get(row.task.subjectId ?? '')?.color),
                    backgroundColor:
                      'color-mix(in srgb, var(--subject-fill) 55%, var(--color-paper-raised))',
                    borderColor: 'var(--subject-pen)',
                    color: 'var(--subject-pen)',
                    borderRadius: '6px 2px 7px 3px / 3px 7px 2px 6px',
                  }}
                >
                  <span className="block font-hand text-[0.92rem] leading-tight">
                    {row.task.title}
                  </span>
                  <span className="mt-0.5 block text-[0.62rem] uppercase tracking-[0.1em] opacity-70" data-num>
                    task · {formatRange(row.start, row.end, timeFormat)}
                  </span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
