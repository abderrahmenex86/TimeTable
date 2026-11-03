import { Input } from '@/components/ui/input'
import { formatClock, parseClock } from '@/domain/time'
import type { Minute } from '@/domain/types'

type TimeFieldProps = {
  id?: string
  value: Minute
  onChange: (minute: Minute) => void
}

/**
 * A native `<input type="time">`.
 *
 * The control renders in the OS locale — a 24-hour setting cannot change it,
 * and on Chrome the `lang` attribute does not either — but it brings the
 * browser's own picker, spinner and mobile keyboard, which is worth more here
 * than matching the app's text format.
 *
 * `value` is always `HH:MM` in 24 hours, regardless of what the field displays.
 */
export function TimeField({ id, value, onChange }: TimeFieldProps) {
  return (
    <Input
      id={id}
      type="time"
      value={formatClock(value, '24h')}
      onChange={(event) => {
        const parsed = parseClock(event.target.value)
        if (parsed !== null) onChange(parsed)
      }}
    />
  )
}
