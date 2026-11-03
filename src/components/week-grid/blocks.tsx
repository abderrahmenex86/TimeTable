import type { CSSProperties } from 'react'
import { FiX } from 'react-icons/fi'
import { formatClock, type TimeFormat } from '@/domain/time'
import type {
  Interval,
  Occurrence,
  SubjectColor,
  Task,
  TaskBlock,
} from '@/domain/types'
import { cn } from '@/lib/utils'
import { heightFor, topFor } from './metrics'
import { subjectVars } from './subject-style'

type Placement = {
  start: number
  end: number
  lane: number
  lanes: number
  window: Interval
}

type BlockProps = {
  lane: number
  lanes: number
  window: Interval
  timeFormat: TimeFormat
}

/**
 * Absolute geometry for one block.
 *
 * A 2px inset keeps neighbouring lanes and vertically-adjacent blocks from
 * touching, which matters more with hand-drawn borders than with flat ones.
 */
function blockStyle({
  start,
  end,
  lane,
  lanes,
  window,
}: Placement): CSSProperties {
  return {
    top: topFor(start, window),
    height: Math.max(heightFor(start, end) - 2, 14),
    left: `calc(${(lane / lanes) * 100}% + 2px)`,
    width: `calc(${100 / lanes}% - 4px)`,
  }
}

const SKETCH_RADIUS = '6px 2px 7px 3px / 3px 7px 2px 6px'

export { SKETCH_RADIUS }

type EntryBlockProps = BlockProps & {
  occurrence: Occurrence
  color?: SubjectColor
  onSelect?: () => void
}

/** A committed session: lecture, lab, shift. Solid, because it is fixed. */
export function EntryBlock({
  occurrence,
  color,
  lane,
  lanes,
  window,
  timeFormat,
  onSelect,
}: EntryBlockProps) {
  const height = heightFor(occurrence.start, occurrence.end) - 2
  const showTime = height >= 40
  const showLocation = height >= 62 && Boolean(occurrence.location)

  return (
    <article
      className="absolute overflow-hidden border-l-[2.5px] px-1.5 py-1 transition-[filter] duration-150 hover:brightness-[0.97]"
      style={{
        ...blockStyle({
          start: occurrence.start,
          end: occurrence.end,
          lane,
          lanes,
          window,
        }),
        ...subjectVars(color),
        backgroundColor: 'var(--subject-fill)',
        borderLeftColor: 'var(--subject-pen)',
        color: 'var(--subject-pen)',
        borderRadius: SKETCH_RADIUS,
      }}
    >
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          aria-label={`${occurrence.title}, ${formatClock(occurrence.start, timeFormat)} to ${formatClock(occurrence.end, timeFormat)}`}
          className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
        />
      ) : null}
      <p
        className={cn(
          'font-hand text-[0.8rem] leading-[1.2]',
          showTime ? 'line-clamp-2' : 'truncate',
        )}
      >
        {occurrence.title}
      </p>
      {showTime ? (
        <p
          className="mt-0.5 text-[0.62rem] leading-tight tabular-nums opacity-75"
          data-num
        >
          {formatClock(occurrence.start, timeFormat)}
        </p>
      ) : null}
      {showLocation ? (
        <p className="truncate text-[0.62rem] leading-tight opacity-60">
          {occurrence.location}
        </p>
      ) : null}
    </article>
  )
}

type StudyBlockProps = BlockProps & {
  block: TaskBlock
  task: Task
  color?: SubjectColor
  onRemove?: () => void
}

/**
 * Planned work. Dashed border and a paler fill: it occupies time, but it is
 * movable in a way a lecture is not.
 */
export function StudyBlock({
  block,
  task,
  color,
  lane,
  lanes,
  window,
  timeFormat,
  onRemove,
}: StudyBlockProps) {
  const height = heightFor(block.start, block.end) - 2
  const showMeta = height >= 40

  return (
    <article
      className="group absolute overflow-hidden border-[1.5px] border-dashed px-1.5 py-1"
      style={{
        ...blockStyle({
          start: block.start,
          end: block.end,
          lane,
          lanes,
          window,
        }),
        ...subjectVars(color),
        backgroundColor:
          'color-mix(in srgb, var(--subject-fill) 55%, var(--color-paper-raised))',
        borderColor: 'var(--subject-pen)',
        color: 'var(--subject-pen)',
        borderRadius: SKETCH_RADIUS,
      }}
    >
      <p
        className={cn(
          'font-hand text-[0.78rem] leading-[1.2]',
          showMeta ? 'line-clamp-2' : 'truncate',
        )}
      >
        {task.title}
      </p>
      {showMeta ? (
        <p
          className="mt-0.5 text-[0.58rem] leading-tight uppercase tracking-[0.12em] opacity-60"
          data-num
        >
          task &middot; {formatClock(block.start, timeFormat)}
        </p>
      ) : null}

      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${task.title} session`}
          className="absolute top-0.5 right-0.5 z-10 rounded-[4px] p-0.5 text-current opacity-0 transition-opacity hover:bg-paper-raised/70 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <FiX className="size-3" />
        </button>
      ) : null}
    </article>
  )
}
