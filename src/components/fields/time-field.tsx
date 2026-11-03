import { useEffect, useRef, useState } from 'react'
import { FiClock } from 'react-icons/fi'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatClock, parseTimeInput, type TimeFormat } from '@/domain/time'
import type { Minute } from '@/domain/types'
import { cn } from '@/lib/utils'

const MINUTE_STEPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

type ColumnOption = number | string

/**
 * One scrollable column of the picker.
 *
 * The selected row is centred on mount by setting `scrollTop` directly rather
 * than `scrollIntoView`, which would also scroll the dialog behind it.
 */
function Column({
  label,
  options,
  selected,
  onSelect,
  render,
}: {
  label: string
  options: ColumnOption[]
  selected: ColumnOption
  onSelect: (option: ColumnOption) => void
  render?: (option: ColumnOption) => string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const active = container.querySelector<HTMLElement>('[data-active="true"]')
    if (!active) return
    container.scrollTop =
      active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2
  }, [])

  return (
    <div className="flex w-16 flex-col">
      <div className="border-b border-rule px-2 py-1 text-[0.55rem] uppercase tracking-[0.12em] text-ink-40">
        {label}
      </div>
      <div
        ref={containerRef}
        className="time-column max-h-52 overflow-y-auto py-1"
      >
        {options.map((option) => {
          const active = option === selected
          return (
            <button
              key={String(option)}
              type="button"
              data-active={active}
              onClick={() => onSelect(option)}
              className={cn(
                'block w-full px-2 py-1 text-center text-[0.8rem] tabular-nums transition-colors',
                active
                  ? 'bg-sky-fill text-sky-pen'
                  : 'text-ink-60 hover:bg-paper-sunk hover:text-ink',
              )}
              data-num
            >
              {render ? render(option) : String(option)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TimeColumns({
  value,
  onChange,
  format,
}: {
  value: Minute
  onChange: (minute: Minute) => void
  format: TimeFormat
}) {
  const is12 = format === '12h'
  const hour24 = Math.floor(value / 60)
  const minute = value % 60

  // Keep the current minute selectable even when it is off the 5-minute grid.
  const minuteOptions = MINUTE_STEPS.includes(minute)
    ? MINUTE_STEPS
    : [...MINUTE_STEPS, minute].sort((a, b) => a - b)

  const selectedHour = is12 ? (hour24 % 12 === 0 ? 12 : hour24 % 12) : hour24
  const selectedPeriod = hour24 < 12 ? 'AM' : 'PM'

  return (
    <div className="flex divide-x divide-rule">
      <Column
        label="Hour"
        options={is12 ? range(1, 12) : range(0, 23)}
        selected={selectedHour}
        onSelect={(option) => {
          const hour = Number(option)
          const base = is12
            ? (hour % 12) + (selectedPeriod === 'PM' ? 12 : 0)
            : hour
          onChange(base * 60 + minute)
        }}
      />
      <Column
        label="Min"
        options={minuteOptions}
        selected={minute}
        onSelect={(option) => onChange(hour24 * 60 + Number(option))}
        render={(option) => String(option).padStart(2, '0')}
      />
      {is12 ? (
        <Column
          label="AM/PM"
          options={['AM', 'PM']}
          selected={selectedPeriod}
          onSelect={(option) => {
            const hour = hour24 % 12
            onChange((option === 'PM' ? hour + 12 : hour) * 60 + minute)
          }}
        />
      ) : null}
    </div>
  )
}

type TimeFieldProps = {
  id?: string
  value: Minute
  onChange: (minute: Minute) => void
  format: TimeFormat
}

/**
 * A clock time with both ways in: type it, or scroll the picker.
 *
 * The input carries the value so a keyboard user never has to open anything;
 * the clock button opens a scrollable list so nobody has to type `21:00` by
 * hand either. While the field is focused it shows exactly what was typed, and
 * on blur it re-renders from the committed value.
 */
export function TimeField({ id, value, onChange, format }: TimeFieldProps) {
  const [draft, setDraft] = useState(() => formatClock(value, format))
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        className="pr-8"
        value={editing ? draft : formatClock(value, format)}
        placeholder={format === '24h' ? '09:00' : '9:00 AM'}
        onFocus={(event) => {
          setDraft(formatClock(value, format))
          setEditing(true)
          event.currentTarget.select()
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
        onChange={(event) => {
          const text = event.target.value
          setDraft(text)
          const parsed = parseTimeInput(text, format)
          if (parsed !== null) onChange(parsed)
        }}
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Pick a time"
            className="absolute top-1/2 right-1 -translate-y-1/2 rounded-[5px_2px_6px_3px/3px_6px_2px_5px] p-1 text-ink-40 transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
          >
            <FiClock className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <TimeColumns value={value} onChange={onChange} format={format} />
        </PopoverContent>
      </Popover>
    </div>
  )
}
