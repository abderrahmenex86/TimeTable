import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WeekGrid } from '@/components/week-grid/week-grid'
import { useWeek } from '@/store/hooks'
import { useTimetable } from '@/store/timetable-store'

export function WeekView() {
  const { term, weekIndex } = useWeek()
  const setWeekIndex = useTimetable((state) => state.setWeekIndex)
  const goToToday = useTimetable((state) => state.goToToday)
  const showFreeTime = useTimetable((state) => state.showFreeTime)
  const toggleFreeTime = useTimetable((state) => state.toggleFreeTime)

  const atStart = weekIndex <= 1
  const atEnd = weekIndex >= term.weekCount

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-4 border-b border-rule px-5 pt-6 pb-3 sm:px-8">
        <div>
          <h1 className="font-hand text-[1.6rem] leading-none">{term.name}</h1>
          <p className="mt-1.5 text-[0.78rem] text-ink-60" data-num>
            Week {weekIndex} of {term.weekCount}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <Button
            variant={showFreeTime ? 'default' : 'outline'}
            size="sm"
            className="font-hand"
            aria-pressed={showFreeTime}
            onClick={toggleFreeTime}
          >
            Free time
          </Button>

          <Button size="sm" className="font-hand">
            <Plus data-icon="inline-start" />
            Add
          </Button>
        </div>
      </header>

      <WeekGrid />
    </div>
  )
}
