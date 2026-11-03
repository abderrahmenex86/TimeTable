import { useCallback } from 'react'
import { toast } from 'sonner'
import { useTimetable } from './timetable-store'

/**
 * Runs a destructive store action and offers to take it back.
 *
 * Every destructive action pushes a snapshot onto `undoStack` before mutating,
 * so undo is a single pop no matter what was deleted — no per-action inverse
 * logic to keep in sync.
 */
export function useUndoable() {
  return useCallback((message: string, action: () => void) => {
    action()
    toast(message, {
      action: {
        label: 'Undo',
        onClick: () => useTimetable.getState().undo(),
      },
    })
  }, [])
}
