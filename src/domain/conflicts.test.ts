import { describe, expect, it } from 'vitest'
import { findConflict } from './conflicts'
import type { Occurrence, Task, TaskBlock } from './types'

const occurrence = (date: string, start: number, end: number): Occurrence => ({
  entryId: 'e1',
  subjectId: 's1',
  title: 'Linear Algebra',
  date,
  start,
  end,
})

const task = (id: string, title: string): Task => ({
  id,
  title,
  status: 'open',
  priority: 'med',
  estimateMinutes: 60,
  createdAt: '2026-11-01T00:00:00Z',
})

const block = (id: string, date: string, start: number, end: number): TaskBlock => ({
  id,
  taskId: 't1',
  date,
  start,
  end,
})

const tasks: Task[] = [task('t1', 'Problem set 4')]

describe('findConflict', () => {
  const day = '2026-11-02'

  it('reports a class that overlaps', () => {
    const conflict = findConflict(
      day,
      { start: 600, end: 660 },
      [occurrence(day, 540, 630)],
      [],
      tasks,
    )
    expect(conflict).toMatchObject({ kind: 'entry', title: 'Linear Algebra' })
  })

  it('allows a range that starts exactly when a class ends', () => {
    expect(
      findConflict(day, { start: 630, end: 690 }, [occurrence(day, 540, 630)], [], tasks),
    ).toBeNull()
  })

  it('allows a range that ends exactly when a class starts', () => {
    expect(
      findConflict(day, { start: 480, end: 540 }, [occurrence(day, 540, 630)], [], tasks),
    ).toBeNull()
  })

  it('ignores classes on other days', () => {
    expect(
      findConflict(day, { start: 540, end: 600 }, [occurrence('2026-11-03', 540, 600)], [], tasks),
    ).toBeNull()
  })

  it('reports an existing task session that overlaps', () => {
    const conflict = findConflict(
      day,
      { start: 700, end: 760 },
      [],
      [block('b1', day, 660, 720)],
      tasks,
    )
    expect(conflict).toMatchObject({ kind: 'task', title: 'Problem set 4' })
  })

  it('can ignore the block being moved', () => {
    expect(
      findConflict(day, { start: 660, end: 720 }, [], [block('b1', day, 660, 720)], tasks, 'b1'),
    ).toBeNull()
  })

  it('still catches a different block when one is ignored', () => {
    const conflict = findConflict(
      day,
      { start: 660, end: 720 },
      [],
      [block('b1', day, 660, 720), block('b2', day, 700, 760)],
      tasks,
      'b1',
    )
    expect(conflict?.kind).toBe('task')
  })

  it('falls back to a generic name for an orphan block', () => {
    const conflict = findConflict(
      day,
      { start: 660, end: 720 },
      [],
      [block('b9', day, 660, 720)],
      [],
    )
    expect(conflict).toMatchObject({ title: 'another session' })
  })

  it('returns null when the day is clear', () => {
    expect(findConflict(day, { start: 300, end: 360 }, [], [], tasks)).toBeNull()
  })
})
