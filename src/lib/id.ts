let counter = 0

/** Stable-enough identifier for new records. */
export function createId(prefix: string): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${(counter += 1).toString(36)}`
  return `${prefix}-${uuid}`
}
