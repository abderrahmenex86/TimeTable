import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Phase 0 shell.
 *
 * This is the real page frame — header, week stepper, grid surface — with the
 * calendar itself still to come. Everything here is meant to be replaced by
 * real state in phase 3; it exists so the design system can be judged in situ
 * rather than on a blank page.
 */
export function WeekView() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule px-5 pt-7 pb-4 sm:px-8">
        <div>
          <h1 className="font-hand text-[1.75rem] leading-none">Timetable</h1>
          <p className="mt-1.5 text-[0.8rem] text-ink-60" data-num>
            Fall 2026 &middot; Week 3 of 12
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" aria-label="Previous week">
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="sm" className="font-hand">
              Today
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="Next week">
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
              Nothing on the week yet
            </h2>
            <p className="mt-2 text-sm text-ink-60">
              Add a class, a lab, or a shift and it will repeat itself across the
              term. Tasks land in the gaps.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button size="sm" className="font-hand">
                <Plus data-icon="inline-start" />
                Add an entry
              </Button>
              <Button variant="outline" size="sm" className="font-hand">
                Add a task
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
