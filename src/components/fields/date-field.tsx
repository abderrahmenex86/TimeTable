import { useState } from 'react'
import { FiCalendar } from 'react-icons/fi'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  dateKeyToDate,
  dateToDateKey,
  formatDayMonth,
  weekdayOf,
} from '@/domain/dates'
import { WEEKDAY_LABELS, type DateKey } from '@/domain/types'

/** `"Thu 5 Nov"` — enough to identify a date without eating the row. */
function formatFieldDate(key: DateKey): string {
  return `${WEEKDAY_LABELS[weekdayOf(key)]} ${formatDayMonth(key)}`
}

type DateFieldProps = {
  id?: string
  value: DateKey | ''
  onChange: (value: DateKey) => void
  placeholder?: string
}

/**
 * A date picker that looks like the other inputs rather than like a button, so
 * the form keeps one visual rhythm.
 */
export function DateField({
  id,
  value,
  onChange,
  placeholder = 'Pick a date',
}: DateFieldProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          className="flex h-8 w-full min-w-0 items-center gap-2 border-[1.5px] border-rule bg-paper-raised px-2.5 text-left text-[0.82rem] transition-colors hover:border-ink-30 focus-visible:border-sky-pen focus-visible:outline-none"
          style={{ borderRadius: '9px 3px 10px 4px / 4px 10px 3px 9px' }}
        >
          <FiCalendar className="size-3.5 shrink-0 text-ink-40" />
          <span className={value ? 'truncate text-ink' : 'truncate text-ink-40'}>
            {value ? formatFieldDate(value) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value ? dateKeyToDate(value) : undefined}
          onSelect={(date) => {
            if (!date) return
            onChange(dateToDateKey(date))
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
