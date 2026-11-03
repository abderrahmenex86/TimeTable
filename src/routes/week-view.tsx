import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWeek } from '@/store/hooks'
import { useTimetable } from '@/store/timetable-store'

/**
 * Phase 2 shell: header is live on real store data, the grid lands next.
 */
export function WeekView() {
  const { term, weekIndex } = useWeek()
  const setWeekIndex = useTimetable((state) => state.setWeekIndex)
  const goToToday = useTimetable((state) => state.goToToday)

  const atStart = weekIndex <= 1
  const atEnd = weekIndex >= term.weekCount

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule px-5 pt-7 pb-4 sm:px-8">
        <div>
          <h1 className="font-hand text-[1.75rem] leading-none">
            {term.name}
          </h1>
          <p className="mt-1.5 text-[0.8rem] text-ink-60" data-num>
            Week {weekIndex} of {term.weekCount}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous week"
              disabled={atStart}
              onClick={() => setWeekIndex(weekIndex - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="font-hand"
              onClick={goToToday}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next week"
              disabled={atEnd}
              onClick={() => setWeekIndex(weekIndex + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
          <Button size="sm" className="font-hand">
            <Plus data-icon="inline-start" />
            Add
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-5 sm:p-8">
        <div className="paper-dots flex flex-1 items-center justify-center rounded-lg border border-rule p-8">
          <div className="sketch ink-shadow max-w-md bg-paper-raised px-8 py-7 text-center">
            <h2 className="font-hand text-2xl leading-tight">
              The grid is next
            </h2>
            <p className="mt-2 text-sm text-ink-60">
              Your term is loaded and persisted. The week grid renders it in the
              following step.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
