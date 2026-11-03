import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { formatClock, parseTimeInput, type TimeFormat } from '@/domain/time'
import type { Minute } from '@/domain/types'

type TimeFieldProps = {
  id?: string
  value: Minute
  onChange: (minute: Minute) => void
  format: TimeFormat
}

/**
 * A clock time the app formats, rather than the browser's native time input.
 *
 * `<input type="time">` is rendered in the OS locale, so a user who picks
 * 24-hour in settings would still see AM/PM in the form. This keeps the whole
 * app on one format.
 *
 * While the field is focused it shows exactly what was typed; on blur it
 * re-renders from the committed value, so a half-typed "9:" simply reverts.
 */
export function TimeField({ id, value, onChange, format }: TimeFieldProps) {
  const [draft, setDraft] = useState(() => formatClock(value, format))
  const [editing, setEditing] = useState(false)

  return (
    <Input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
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
  )
}
