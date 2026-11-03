import { formatDuration } from '@/domain/time'
import type { Task, TaskBlock } from '@/domain/types'
import { taskProgress } from '@/domain/tasks'
import { cn } from '@/lib/utils'

const SEGMENTS = 8

/**
 * How much of a task's estimate is already on the calendar.
 *
 * Drawn as pen ticks rather than a smooth progress bar: eight discrete marks
 * survive the paper aesthetic, and they answer the question this app exists to
 * ask — "how much of this have I actually planned?" — rather than "how much
 * have I done?".
 */
export function EffortBar({
  task,
  blocks,
  className,
}: {
  task: Task
  blocks: TaskBlock[]
  className?: string
}) {
  const { estimate, scheduled, remaining, ratio, overscheduled } = taskProgress(
    task,
    blocks,
  )
  const filled = Math.round(ratio * SEGMENTS)
  const misplaced = scheduled > 0 && remaining > 0 && scheduled < 15

  return (
    <div className={cn('mt-1.5', className)}>
      <div className="flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <span
            key={index}
            className={cn(
              'h-1 flex-1 rounded-[1px]',
              index < filled ? 'bg-current opacity-70' : 'bg-current opacity-15',
            )}
          />
        ))}
      </div>
      <p className="mt-1 text-[0.62rem] text-ink-40" data-num>
        {scheduled === 0
          ? `${formatDuration(estimate)} of work, nothing placed`
          : overscheduled
            ? `${formatDuration(estimate)} of work, ${formatDuration(scheduled)} placed`
            : `${formatDuration(scheduled)} of ${formatDuration(estimate)} placed`}
        {misplaced ? ' · check overlap' : ''}
      </p>
    </div>
  )
}
