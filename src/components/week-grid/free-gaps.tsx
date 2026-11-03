import { formatDuration } from '@/domain/time'
import type { Interval } from '@/domain/types'
import { heightFor, topFor } from './metrics'

/**
 * Free gaps, shown as hatched paper rather than as an absence.
 *
 * The hatching is a static background image, not a live filter, so it costs
 * nothing to paint while scrolling. Durations only appear when a gap is tall
 * enough to hold the label without clipping.
 */
export function FreeGaps({
  gaps,
  window,
}: {
  gaps: Interval[]
  window: Interval
}) {
  return (
    <>
      {gaps.map((gap) => {
        const height = heightFor(gap.start, gap.end)

        return (
          <div
            key={gap.start}
            className="pointer-events-none absolute inset-x-[2px] flex items-center justify-center overflow-hidden"
            style={{
              top: topFor(gap.start, window),
              height: Math.max(height - 2, 0),
              // No background colour: only a translucent hatch, so the hour
              // rules and the "today" tint stay legible underneath.
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent 0 6px, color-mix(in srgb, var(--color-ink) 8%, transparent) 6px 7px)',
              borderRadius: '5px 2px 6px 3px / 3px 6px 2px 5px',
            }}
          >
            {height >= 32 ? (
              <span
                className="text-[0.6rem] tabular-nums text-ink-40"
                data-num
              >
                {formatDuration(gap.end - gap.start)}
              </span>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
