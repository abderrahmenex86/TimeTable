import { FiPlus, FiTrash2 } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SUBJECT_COLORS, type SubjectColor } from '@/domain/types'
import { createId } from '@/lib/id'
import { cn } from '@/lib/utils'
import { useTimetable } from '@/store/timetable-store'
import { useUndoable } from '@/store/undo'

type SubjectsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Rename and recolour subjects.
 *
 * Edits commit immediately rather than on save: the grid behind the dialog
 * updates as you type, which is the quickest way to judge a colour.
 */
export function SubjectsDialog({ open, onOpenChange }: SubjectsDialogProps) {
  const subjects = useTimetable((state) => state.subjects)
  const addSubject = useTimetable((state) => state.addSubject)
  const updateSubject = useTimetable((state) => state.updateSubject)
  const deleteSubject = useTimetable((state) => state.deleteSubject)
  const run = useUndoable()

  const nextColor = (): SubjectColor =>
    SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-hand text-xl font-normal">
            Subjects
          </DialogTitle>
          <DialogDescription>
            Names and colours apply everywhere at once. Deleting a subject also
            removes its sessions; tasks keep their title.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[52vh] flex-col gap-2 overflow-y-auto pr-1">
          {subjects.length === 0 ? (
            <p className="py-4 text-center text-[0.8rem] text-ink-40">
              No subjects yet.
            </p>
          ) : null}

          {subjects.map((subject) => (
            <div key={subject.id} className="flex items-center gap-2">
              <Input
                value={subject.name}
                aria-label={`Name of ${subject.name || 'subject'}`}
                onChange={(event) =>
                  updateSubject(subject.id, { name: event.target.value })
                }
                placeholder="Subject name"
              />

              <div className="flex shrink-0 items-center gap-1">
                {SUBJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`${color} colour`}
                    aria-pressed={subject.color === color}
                    onClick={() => updateSubject(subject.id, { color })}
                    className={cn(
                      'size-4 rounded-full border-2 transition-transform hover:scale-110',
                      subject.color === color
                        ? 'border-ink'
                        : 'border-transparent',
                    )}
                    style={{ backgroundColor: `var(--${color}-fill)` }}
                  />
                ))}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${subject.name || 'subject'}`}
                onClick={() =>
                  run('Subject deleted', () => deleteSubject(subject.id))
                }
              >
                <FiTrash2 />
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mr-auto"
            onClick={() =>
              addSubject({
                id: createId('sub'),
                name: 'New subject',
                color: nextColor(),
              })
            }
          >
            <FiPlus data-icon="inline-start" />
            Add subject
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
