export type Theme = 'dark' | 'light'

const KEY = 'life-hub.theme.v1'

/** Gespeichertes Theme, sonst System-Präferenz, sonst Dunkel. */
export function loadTheme(): Theme {
  const saved = localStorage.getItem(KEY)
  if (saved === 'light' || saved === 'dark') return saved
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'light'
  }
  return 'dark'
}

/** Setzt das Theme auf dem <html>-Element (die CSS-Variablen reagieren darauf). */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

export function saveTheme(theme: Theme): void {
  localStorage.setItem(KEY, theme)
  applyTheme(theme)
}
