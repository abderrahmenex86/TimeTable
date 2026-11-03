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
import { nowMinute } from '@/domain/dates'
import { formatClock } from '@/domain/time'
import { useNow, useTimeFormat, useWeek } from '@/store/hooks'
import { useTimetable } from '@/store/timetable-store'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/**
 * The clock is its own component so a one-second tick does not re-render the
 * toolbar around it. Date and time share one face and one size — it reads as a
 * single stamp rather than two pieces of metadata.
 */
function Clock() {
  const now = useNow(1000)
  const timeFormat = useTimeFormat()
  const key = todayKey(now)

  return (
    <span
      className="whitespace-nowrap font-hand text-[1.05rem] leading-none text-ink"
      title="Current date and time"
    >
      {WEEKDAY_LABELS[weekdayOf(key)]} {Number(key.slice(8))}{' '}
      {MONTHS[Number(key.slice(5, 7)) - 1]} · {formatClock(nowMinute(now), timeFormat)}
    </span>
  )
}

type TopBarProps = {
  onNewTask: () => void
  onNewSession: () => void
  onOpenTasks: () => void
}

/**
 * The toolbar. Week selection first, the date and time centred in the bar, and
 * the actions on the right.
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
    <header className="no-print relative flex flex-wrap items-center gap-x-2 gap-y-2 rounded-2xl border border-rule bg-paper-raised px-3 py-2">
      <div className="mx-auto flex items-center gap-1 sm:mx-0">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous week"
          disabled={atStart}
          onClick={() => setWeekIndex(weekIndex - 1)}
        >
          <FiChevronLeft />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          title="Jump to the current week"
        >
          Week {weekIndex} / {term.weekCount}
        </Button>

        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next week"
          disabled={atEnd}
          onClick={() => setWeekIndex(weekIndex + 1)}
        >
          <FiChevronRight />
        </Button>
      </div>

      <div className="pointer-events-none flex w-full justify-center sm:absolute sm:left-1/2 sm:w-auto sm:-translate-x-1/2">
        <Clock />
      </div>

      <div className="mx-auto flex flex-wrap items-center gap-2 sm:mx-0 sm:ml-auto">
        <Button
          variant={showFreeTime ? 'default' : 'outline'}
          size="sm"
          aria-pressed={showFreeTime}
          onClick={toggleFreeTime}
        >
          Free time
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="lg:hidden"
          onClick={onOpenTasks}
        >
          Tasks {countOpen(tasks)}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
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

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
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
              <Button variant="outline" size="icon-sm" asChild>
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
                variant={tasksLocked ? 'default' : 'outline'}
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
