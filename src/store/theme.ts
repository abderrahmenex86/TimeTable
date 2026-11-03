import { useEffect } from 'react'
import { useTimetable } from './timetable-store'

const THEME_STORAGE_KEY = 'timetable-theme'

/**
 * Applies the theme to <html>.
 *
 * The class is mirrored into localStorage so `index.html` can restore it before
 * the first paint — IndexedDB is async, so without that mirror a dark-mode user
 * would see a white flash on every load.
 */
export function useApplyTheme() {
  const theme = useTimetable((state) => state.settings.theme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Private mode or storage disabled: the class is still applied.
    }

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#17181a' : '#fbfaf8')
    }
  }, [theme])
}

/**
 * Printing always uses the light palette — a dark timetable wastes ink and
 * reads badly on paper.
 */
export function usePrintTheme() {
  useEffect(() => {
    const root = document.documentElement

    const before = () => root.classList.remove('dark')
    const after = () => {
      if (useTimetable.getState().settings.theme === 'dark') {
        root.classList.add('dark')
      }
    }

    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])
}
