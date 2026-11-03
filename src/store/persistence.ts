import { createStore, del, get, set } from 'idb-keyval'
import type { PersistStorage, StorageValue } from 'zustand/middleware'

/**
 * IndexedDB persistence for the timetable.
 *
 * Two things worth knowing:
 *
 * 1. Writes are debounced. Dragging a block fires a state update on every
 *    pointer move, and serialising the whole document sixty times a second
 *    would be wasteful. We keep only the latest value and flush shortly after.
 * 2. Because writes are debounced, we flush on `pagehide` and when the tab is
 *    hidden, otherwise the last change before a refresh can be lost.
 */

const DB_NAME = 'timetable'
const STORE_NAME = 'state'
const WRITE_DELAY_MS = 250

const db = createStore(DB_NAME, STORE_NAME)

let timer: ReturnType<typeof setTimeout> | undefined
let pending: { key: string; value: string } | null = null

export function flushPersistence(): void {
  if (!pending) return
  const { key, value } = pending
  pending = null
  if (timer !== undefined) {
    clearTimeout(timer)
    timer = undefined
  }
  void set(key, value, db)
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPersistence)
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPersistence()
  })
}

export function createIndexedDbStorage<S>(): PersistStorage<S> {
  return {
    async getItem(name) {
      const raw = await get<string>(name, db)
      if (raw === undefined) return null
      return JSON.parse(raw) as StorageValue<S>
    },

    setItem(name, value) {
      pending = { key: name, value: JSON.stringify(value) }
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(flushPersistence, WRITE_DELAY_MS)
      return Promise.resolve()
    },

    async removeItem(name) {
      pending = null
      await del(name, db)
    },
  }
}
