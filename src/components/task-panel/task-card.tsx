import { useDraggable } from '@dnd-kit/core'
import { FiCalendar } from 'react-icons/fi'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDayMonth } from '@/domain/dates'
import type { Moment } from '@/domain/tasks'
import { formatClock } from '@/domain/time'
import type { Subject, Task, TaskBlock } from '@/domain/types'
import { DEADLINE_TONE_CLASS, describeDeadline } from '@/lib/deadline'
import { cn } from '@/lib/utils'
import { useScheduling } from '@/store/scheduling'
import { useTimetable } from '@/store/timetable-store'
import { useUndoable } from '@/store/undo'
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
  const tasksLocked = useTimetable((state) => state.settings.tasksLocked)
  const { placeInNextSlot } = useScheduling()
  const run = useUndoable()

  // Only the pointer listeners are attached. Spreading dnd-kit's `attributes`
  // would put role="button" on a container that already holds real buttons.
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: task.id,
    data: { taskId: task.id },
    disabled: tasksLocked,
  })

  const done = task.status === 'done'
  const deadline = describeDeadline(task, now)

  function handlePlace() {
    const slot = placeInNextSlot(task)
    if (!slot) {
      toast.error('No free slot', {
        description: 'Nothing fits in the next two weeks before the deadline.',
      })
      return
    }
    toast.success(`Placed ${task.title}`, {
      description: `${formatDayMonth(slot.date)} · ${formatClock(slot.start)}–${formatClock(slot.end)}`,
    })
  }

  return (
    <li>
      <div
        ref={setNodeRef}
        {...listeners}
        className={cn(
          'group flex items-start gap-2 border border-rule bg-paper-raised px-2.5 py-2 transition-colors',
          tasksLocked
            ? 'cursor-default'
            : 'cursor-grab active:cursor-grabbing',
          !done && 'hover:border-ink-30',
          done && 'opacity-70',
          isDragging && 'opacity-40',
        )}
        style={{ borderRadius: '10px 3px 11px 4px / 4px 11px 3px 10px' }}
      >
        <Checkbox
          checked={done}
          onCheckedChange={() =>
            run(done ? 'Task reopened' : 'Task completed', () =>
              toggleTask(task.id),
            )
          }
          aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
          className="mt-[3px] shrink-0"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="block min-w-0 flex-1 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
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

            {!done ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handlePlace}
                    disabled={tasksLocked}
                    aria-label={`Place ${task.title} in the next free slot`}
                    className="mt-0.5 shrink-0 rounded-sm p-0.5 text-ink-40 opacity-0 transition-opacity hover:text-sky-pen focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0"
                  >
                    <FiCalendar className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {tasksLocked
                    ? 'Calendar is locked'
                    : 'Find the next free slot'}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.68rem]">
            {subject ? (
              <span className="inline-flex items-center gap-1 text-ink-60">
                <span
                  className="size-[6px] shrink-0 rounded-full"
                  style={{ backgroundColor: `var(--color-${subject.color}-pen)` }}
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
