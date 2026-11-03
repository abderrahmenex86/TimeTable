import { Link } from 'react-router'
import { FiArrowLeft, FiLock, FiMoon, FiSun, FiUnlock } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { WEEKDAYS, WEEKDAY_LABELS, type Weekday } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useTimetable } from '@/store/timetable-store'
import { useUndoable } from '@/store/undo'

const DAY_NAMES: Record<Weekday, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-3 border-b border-rule pb-5 last:border-0 last:pb-0 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
      <div>
        <h2 className="font-hand text-[1.05rem] leading-tight">{title}</h2>
        <p className="mt-1 text-[0.76rem] leading-snug text-ink-60">
          {description}
        </p>
      </div>
      <div>{children}</div>
    </section>
  )
}

export function SettingsView() {
  const theme = useTimetable((state) => state.settings.theme)
  const setTheme = useTimetable((state) => state.setTheme)
  const weekStartsOn = useTimetable((state) => state.settings.weekStartsOn)
  const setWeekStartsOn = useTimetable((state) => state.setWeekStartsOn)
  const tasksLocked = useTimetable((state) => state.settings.tasksLocked)
  const toggleTaskLock = useTimetable((state) => state.toggleTaskLock)
  const resetToDemo = useTimetable((state) => state.resetToDemo)
  const clearAll = useTimetable((state) => state.clearAll)

  const run = useUndoable()

  return (
    <div className="min-h-dvh bg-paper p-3 sm:p-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <header className="no-print flex items-center gap-2 rounded-2xl border border-rule bg-paper-raised px-2 py-1.5">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to="/" aria-label="Back to the timetable">
              <FiArrowLeft />
            </Link>
          </Button>
          <h1 className="font-hand text-[1.15rem] leading-none">Settings</h1>
        </header>

        <div className="flex flex-col gap-5 rounded-2xl border border-rule bg-paper-raised p-5">
          <Section
            title="Appearance"
            description="Paper by day, ink by night."
          >
            <div className="flex gap-2">
              {(
                [
                  { value: 'light', label: 'Light', icon: <FiSun /> },
                  { value: 'dark', label: 'Dark', icon: <FiMoon /> },
                ] as const
              ).map((option) => {
                const active = theme === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 border px-3 py-2 text-[0.82rem] transition-colors',
                      active
                        ? 'border-sky-pen bg-sky-fill text-sky-pen'
                        : 'border-rule bg-paper-raised text-ink-60 hover:border-ink-30',
                    )}
                    style={{ borderRadius: '10px 3px 11px 4px / 4px 11px 3px 10px' }}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                )
              })}
            </div>
          </Section>

          <Section
            title="Week starts on"
            description="Changes where the grid begins and how week numbers are counted for the term."
          >
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
              {WEEKDAYS.map((day) => {
                const active = weekStartsOn === day
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={active}
                    aria-label={DAY_NAMES[day]}
                    title={DAY_NAMES[day]}
                    onClick={() => setWeekStartsOn(day)}
                    className={cn(
                      'border px-1 py-1.5 text-[0.74rem] transition-colors',
                      active
                        ? 'border-sky-pen bg-sky-fill text-sky-pen'
                        : 'border-rule bg-paper-raised text-ink-60 hover:border-ink-30',
                    )}
                    style={{ borderRadius: '8px 2px 9px 3px / 3px 9px 2px 8px' }}
                  >
                    {WEEKDAY_LABELS[day]}
                  </button>
                )
              })}
            </div>
          </Section>

          <Section
            title="Calendar lock"
            description="While locked, tasks cannot be dragged onto the grid."
          >
            <Button
              variant={tasksLocked ? 'default' : 'outline'}
              size="sm"
              className="font-hand"
              aria-pressed={tasksLocked}
              onClick={toggleTaskLock}
            >
              {tasksLocked ? (
                <FiLock data-icon="inline-start" />
              ) : (
                <FiUnlock data-icon="inline-start" />
              )}
              {tasksLocked ? 'Locked' : 'Unlocked'}
            </Button>
          </Section>

          <Section
            title="Data"
            description="Everything is stored in this browser only. Nothing leaves the device."
          >
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="font-hand"
                onClick={() => run('Demo data restored', resetToDemo)}
              >
                Reset demo data
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="font-hand"
                onClick={() => run('Everything cleared', clearAll)}
              >
                Clear all data
              </Button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
