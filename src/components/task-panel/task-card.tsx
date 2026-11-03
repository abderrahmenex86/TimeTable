import { Checkbox } from '@/components/ui/checkbox'
import type { Moment } from '@/domain/tasks'
import type { Subject, Task, TaskBlock } from '@/domain/types'
import { DEADLINE_TONE_CLASS, describeDeadline } from '@/lib/deadline'
import { cn } from '@/lib/utils'
import { useTimetable } from '@/store/timetable-store'
import { EffortBar } from './effort-bar'

type TaskCardProps = {
  task: Task
  subject?: Subject
  blocks: TaskBlock[]
  now: Moment
  onEdit: (task: Task) => void
}

export function TaskCard({ task, subject, blocks, now, onEdit }: TaskCardProps) {
  const toggleTask = useTimetable((state) => state.toggleTask)
  const done = task.status === 'done'
  const deadline = describeDeadline(task, now)

  return (
    <li>
      <div
        className={cn(
          'flex items-start gap-2 border border-rule bg-paper-raised px-2.5 py-2 transition-colors',
          !done && 'hover:border-ink-30',
          done && 'opacity-70',
        )}
        style={{ borderRadius: '10px 3px 11px 4px / 4px 11px 3px 10px' }}
        onClick={(event) => {
          // The title button is the accessible control; clicking anywhere else
          // on the card is a convenience shortcut to the same dialog.
          if (event.target === event.currentTarget) onEdit(task)
        }}
      >
        <Checkbox
          checked={done}
          onCheckedChange={() => toggleTask(task.id)}
          aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
          className="mt-[3px] shrink-0"
        />

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="block w-full rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <span
              className={cn(
                'font-hand text-[0.95rem] leading-[1.25]',
                done ? 'text-ink-40 line-through' : 'text-ink',
              )}
            >
              {task.title}
            </span>
          </button>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.68rem]">
            {subject ? (
              <span className="inline-flex items-center gap-1 text-ink-60">
                <span
                  className="size-[6px] shrink-0 rounded-full"
                  style={{
                    backgroundColor: `var(--color-${subject.color}-pen)`,
                  }}
                />
                {subject.name}
              </span>
            ) : null}

            {deadline ? (
              <span
                className={cn('tabular-nums', DEADLINE_TONE_CLASS[deadline.tone])}
                data-num
              >
                {subject ? '· ' : ''}
                {deadline.label}
              </span>
            ) : null}

            {!done && task.priority === 'high' ? (
              <span className="text-[0.58rem] uppercase tracking-[0.12em] text-rose-pen">
                high
              </span>
            ) : null}
          </div>

          {!done ? (
            <EffortBar task={task} blocks={blocks} className="text-ink-60" />
          ) : null}
        </div>
      </div>
    </li>
  )
}
