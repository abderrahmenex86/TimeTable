import { useMemo } from 'react'
import { FiPlus } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { endOfWeek, nowMinute, todayKey } from '@/domain/dates'
import { countOpen, groupTasks } from '@/domain/tasks'
import type { Task, TaskBlock } from '@/domain/types'
import { useTimetable } from '@/store/timetable-store'
import { TaskCard } from './task-card'

type TaskPanelProps = {
  onCreate: () => void
  onEdit: (task: Task) => void
}

/**
 * The task dock.
 *
 * Grouped by urgency rather than by subject: the panel's job is to answer "what
 * needs attention", and the week grid already answers "what is Linear Algebra".
 * Rendered inside the task card on desktop and inside a drawer on phones.
 */
export function TaskPanel({ onCreate, onEdit }: TaskPanelProps) {
  const tasks = useTimetable((state) => state.tasks)
  const blocks = useTimetable((state) => state.blocks)
  const subjects = useTimetable((state) => state.subjects)
  const weekStartsOn = useTimetable((state) => state.settings.weekStartsOn)

  const today = todayKey()
  const now = { date: today, minute: nowMinute() }
  const groups = groupTasks(tasks, now, endOfWeek(today, weekStartsOn))
  const openCount = countOpen(tasks)

  const blocksByTask = useMemo(() => {
    const map = new Map<string, TaskBlock[]>()
    for (const block of blocks) {
      const bucket = map.get(block.taskId)
      if (bucket) bucket.push(block)
      else map.set(block.taskId, [block])
    }
    return map
  }, [blocks])

  const subjectsById = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-rule px-3">
        <div className="flex items-baseline gap-2">
          <h2 className="font-hand text-[1.15rem] leading-none">Tasks</h2>
          <span className="text-[0.72rem] tabular-nums text-ink-40" data-num>
            {openCount}
          </span>
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="New task"
          onClick={onCreate}
        >
          <FiPlus />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {groups.length === 0 ? (
          <p className="px-1 text-[0.8rem] leading-relaxed text-ink-40">
            No tasks yet. Anything with a deadline and an estimate can be placed
            into the week.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.id} className="mb-4 last:mb-0">
              <h3 className="mb-1.5 flex items-baseline gap-1.5 px-1 text-[0.64rem] uppercase tracking-[0.16em] text-ink-60">
                <span className={group.id === 'overdue' ? 'text-rose-pen' : ''}>
                  {group.label}
                </span>
                <span className="tabular-nums" data-num>
                  {group.tasks.length}
                </span>
              </h3>

              <ul className="flex flex-col gap-1.5">
                {group.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    subject={
                      task.subjectId ? subjectsById.get(task.subjectId) : undefined
                    }
                    blocks={blocksByTask.get(task.id) ?? []}
                    now={now}
                    onEdit={onEdit}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
