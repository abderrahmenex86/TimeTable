import { describe, expect, it } from 'vitest'
import {
  compareTasks,
  groupTasks,
  isFullyScheduled,
  isOverdue,
  normalizeEstimate,
  remainingMinutes,
  scheduledMinutes,
  taskProgress,
} from './tasks'
import type { Task, TaskBlock } from './types'

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Lab report',
  status: 'open',
  priority: 'med',
  estimateMinutes: 180,
  createdAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
})

const block = (start: number, end: number, taskId = 'task-1'): TaskBlock => ({
  id: `b-${start}`,
  taskId,
  date: '2026-11-02',
  start,
  end,
})

describe('scheduledMinutes', () => {
  it('sums the blocks committed to a task', () => {
    expect(scheduledMinutes('task-1', [block(540, 600), block(700, 760)])).toBe(
      120,
    )
  })

  it('ignores other tasks and degenerate blocks', () => {
    expect(
      scheduledMinutes('task-1', [block(540, 600, 'other'), block(700, 700)]),
    ).toBe(0)
  })
})

describe('remainingMinutes', () => {
  it('subtracts scheduled work from the estimate', () => {
    expect(remainingMinutes(task(), [block(540, 600)])).toBe(120)
  })

  it('goes negative when over-scheduled', () => {
    expect(remainingMinutes(task(), [block(480, 720)])).toBe(-60)
  })

  it('reports fully scheduled at exactly the estimate', () => {
    expect(isFullyScheduled(task(), [block(480, 660)])).toBe(true)
    expect(isFullyScheduled(task(), [block(480, 600)])).toBe(false)
  })
})

describe('taskProgress', () => {
  it('clamps the ratio for the segmented bar', () => {
    const progress = taskProgress(task(), [block(480, 720)])
    expect(progress.ratio).toBe(1)
    expect(progress.overscheduled).toBe(true)
    expect(progress.remaining).toBe(0)
  })

  it('reports partial progress', () => {
    const progress = taskProgress(task(), [block(480, 570)])
    expect(progress.ratio).toBeCloseTo(0.5)
    expect(progress.remaining).toBe(90)
  })
})

describe('normalizeEstimate', () => {
  it('falls back to an hour for missing or nonsense values', () => {
    expect(normalizeEstimate(0)).toBe(60)
    expect(normalizeEstimate(-5)).toBe(60)
    expect(normalizeEstimate(Number.NaN)).toBe(60)
  })

  it('rounds valid values', () => {
    expect(normalizeEstimate(90.6)).toBe(91)
  })
})

describe('isOverdue', () => {
  const now = { date: '2026-11-03', minute: 720 }

  it('is true past the deadline', () => {
    expect(
      isOverdue(task({ deadline: { date: '2026-11-03', at: 719 } }), now),
    ).toBe(true)
  })

  it('is false exactly at the deadline', () => {
    expect(
      isOverdue(task({ deadline: { date: '2026-11-03', at: 720 } }), now),
    ).toBe(false)
  })

  it('is false the day before', () => {
    expect(
      isOverdue(task({ deadline: { date: '2026-11-02', at: 1400 } }), now),
    ).toBe(true)
    expect(
      isOverdue(task({ deadline: { date: '2026-11-04', at: 0 } }), now),
    ).toBe(false)
  })

  it('is false for completed tasks', () => {
    expect(
      isOverdue(
        task({ status: 'done', deadline: { date: '2026-10-01', at: 0 } }),
        now,
      ),
    ).toBe(false)
  })

  it('is false without a deadline', () => {
    expect(isOverdue(task(), now)).toBe(false)
  })
})

describe('compareTasks', () => {
  it('orders by deadline first', () => {
    const soon = task({ id: 'a', deadline: { date: '2026-11-04', at: 540 } })
    const later = task({ id: 'b', deadline: { date: '2026-11-20', at: 540 } })
    expect([later, soon].sort(compareTasks).map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('breaks deadline ties with priority', () => {
    const deadline = { date: '2026-11-04', at: 540 }
    const low = task({ id: 'low', priority: 'low', deadline })
    const high = task({ id: 'high', priority: 'high', deadline })
    expect([low, high].sort(compareTasks).map((t) => t.id)).toEqual([
      'high',
      'low',
    ])
  })

  it('sorts undated tasks last', () => {
    const dated = task({ id: 'dated', deadline: { date: '2026-12-01', at: 0 } })
    const undated = task({ id: 'undated' })
    expect([undated, dated].sort(compareTasks).map((t) => t.id)).toEqual([
      'dated',
      'undated',
    ])
  })
})

describe('groupTasks', () => {
  const now = { date: '2026-11-03', minute: 720 }
  const weekEnd = '2026-11-08'

  const tasks = [
    task({ id: 'late', deadline: { date: '2026-11-03', at: 600 } }),
    task({ id: 'today', deadline: { date: '2026-11-03', at: 1080 } }),
    task({ id: 'week', deadline: { date: '2026-11-06', at: 540 } }),
    task({ id: 'later', deadline: { date: '2026-12-01', at: 540 } }),
    task({ id: 'someday' }),
    task({ id: 'finished', status: 'done', completedAt: '2026-11-02T09:00:00Z' }),
  ]

  it('buckets tasks by urgency', () => {
    const groups = groupTasks(tasks, now, weekEnd)
    const byId = Object.fromEntries(
      groups.map((group) => [group.id, group.tasks.map((t) => t.id)]),
    )

    expect(byId.overdue).toEqual(['late'])
    expect(byId.today).toEqual(['today'])
    expect(byId.week).toEqual(['week'])
    expect(byId.later).toEqual(['later'])
    expect(byId.someday).toEqual(['someday'])
    expect(byId.done).toEqual(['finished'])
  })

  it('omits empty groups and keeps a stable order', () => {
    const groups = groupTasks([task({ id: 'only' })], now, weekEnd)
    expect(groups.map((group) => group.id)).toEqual(['someday'])
  })

  it('treats a deadline exactly now as due today, not overdue', () => {
    const groups = groupTasks(
      [task({ id: 'edge', deadline: { date: '2026-11-03', at: 720 } })],
      now,
      weekEnd,
    )
    expect(groups[0].id).toBe('today')
  })
})
