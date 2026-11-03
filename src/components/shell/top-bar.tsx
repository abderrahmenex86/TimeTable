import { Link } from 'react-router'
import {
  FiChevronLeft,
  FiChevronRight,
  FiLock,
  FiMoon,
  FiPlus,
  FiSettings,
  FiSun,
  FiUnlock,
} from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { todayKey, weekdayOf } from '@/domain/dates'
import { countOpen } from '@/domain/tasks'
import { WEEKDAY_LABELS } from '@/domain/types'
import { useNow, useWeek } from '@/store/hooks'
import { useTimetable } from '@/store/timetable-store'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * The clock is its own component so a one-second tick does not re-render the
 * toolbar around it.
 */
function Clock() {
  const now = useNow(1000)
  const key = todayKey(now)

  return (
    <div className="flex items-baseline gap-2 whitespace-nowrap">
      <span className="font-hand text-[1.05rem] leading-none text-ink">
        {WEEKDAY_LABELS[weekdayOf(key)]}
      </span>
      <span className="text-[0.78rem] text-ink-60" data-num>
        {Number(key.slice(8))} {MONTHS[Number(key.slice(5, 7)) - 1]}
      </span>
      <span
        className="text-[0.8rem] tabular-nums text-ink-60"
        data-num
        aria-label="Current time"
      >
        {pad(now.getHours())}:{pad(now.getMinutes())}
      </span>
    </div>
  )
}

type TopBarProps = {
  onNewTask: () => void
  onNewSession: () => void
  onOpenTasks: () => void
}

/**
 * The toolbar. Date and time on the left, week navigation in the middle,
 * actions on the right — and it sits inside the same padded column as the
 * calendar and task cards below it.
 */
export function TopBar({ onNewTask, onNewSession, onOpenTasks }: TopBarProps) {
  const { term, weekIndex } = useWeek()
  const setWeekIndex = useTimetable((state) => state.setWeekIndex)
  const goToToday = useTimetable((state) => state.goToToday)
  const showFreeTime = useTimetable((state) => state.showFreeTime)
  const toggleFreeTime = useTimetable((state) => state.toggleFreeTime)
  const theme = useTimetable((state) => state.settings.theme)
  const setTheme = useTimetable((state) => state.setTheme)
  const tasksLocked = useTimetable((state) => state.settings.tasksLocked)
  const toggleTaskLock = useTimetable((state) => state.toggleTaskLock)
  const tasks = useTimetable((state) => state.tasks)

  const atStart = weekIndex <= 1
  const atEnd = weekIndex >= term.weekCount

  return (
    <header className="no-print flex flex-wrap items-center gap-x-2 gap-y-2 rounded-2xl border border-rule bg-paper-raised px-3 py-2">
      <Clock />

      <span className="mx-1 hidden h-5 w-px bg-rule sm:block" />

      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous week"
          disabled={atStart}
          onClick={() => setWeekIndex(weekIndex - 1)}
        >
          <FiChevronLeft />
        </Button>
        <button
          type="button"
          onClick={goToToday}
          className="rounded-md px-1.5 py-1 text-[0.78rem] tabular-nums text-ink-60 transition-colors hover:text-ink"
          data-num
          title="Jump to the current week"
        >
          Week {weekIndex} / {term.weekCount}
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Next week"
          disabled={atEnd}
          onClick={() => setWeekIndex(weekIndex + 1)}
        >
          <FiChevronRight />
        </Button>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button
          variant={showFreeTime ? 'default' : 'outline'}
          size="sm"
          className="font-hand"
          aria-pressed={showFreeTime}
          onClick={toggleFreeTime}
        >
          Free time
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="font-hand lg:hidden"
          onClick={onOpenTasks}
        >
          Tasks {countOpen(tasks)}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="font-hand">
              <FiPlus data-icon="inline-start" />
              Add
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={onNewTask}>New task</DropdownMenuItem>
            <DropdownMenuItem onSelect={onNewSession}>
              New session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={
                  theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
                }
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <FiSun /> : <FiMoon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Appearance</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" asChild>
                <Link to="/settings" aria-label="Settings">
                  <FiSettings />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tasksLocked ? 'default' : 'ghost'}
                size="icon-sm"
                aria-label={
                  tasksLocked
                    ? 'Unlock the calendar so tasks can be scheduled'
                    : 'Lock the calendar'
                }
                aria-pressed={tasksLocked}
                onClick={toggleTaskLock}
              >
                {tasksLocked ? <FiLock /> : <FiUnlock />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {tasksLocked ? 'Calendar locked' : 'Calendar unlocked'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  )
}
