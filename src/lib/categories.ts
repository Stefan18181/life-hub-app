import { EVENT_COLORS } from './colors'

const KEY = 'life-hub.categories.v1'

/** Zuordnung Farb-Schlüssel → benutzerdefinierter Name. */
export type CategoryNames = Record<string, string>

export function defaultCategoryNames(): CategoryNames {
  return Object.fromEntries(EVENT_COLORS.map((c) => [c.key, c.label]))
}

/** Lädt die Kategorie-Namen (überschreibt die Standardnamen mit gespeicherten). */
export function loadCategoryNames(): CategoryNames {
  const names = defaultCategoryNames()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return names
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      for (const c of EVENT_COLORS) {
        const value = (parsed as Record<string, unknown>)[c.key]
        if (typeof value === 'string' && value.trim()) names[c.key] = value.trim()
      }
    }
    return names
  } catch {
    return names
  }
}

export function saveCategoryNames(names: CategoryNames): void {
  localStorage.setItem(KEY, JSON.stringify(names))
}

/** Name einer Kategorie (Farb-Schlüssel); Fallback auf Standardname bzw. Schlüssel. */
export function categoryName(names: CategoryNames, key?: string): string {
  const k = key ?? 'gold'
  return names[k] ?? defaultCategoryNames()[k] ?? k
}
