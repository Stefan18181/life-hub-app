import { EVENT_COLORS } from './colors'
import { isoDate } from './date'
import { nextOccurrence, type CalendarEvent } from './events'
import { extractWikiLinks, type Note } from './notes'
import type { Todo } from './todos'

export interface CategoryCount {
  key: string
  count: number
}

export interface Stats {
  todos: { open: number; done: number; recurring: number }
  events: { total: number; recurring: number; upcoming: number; byCategory: CategoryCount[] }
  notes: { count: number; words: number; withLinks: number }
}

/** Zählt Wörter in einem (Markdown-)Text. */
export function wordCount(text: string): number {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

const UPCOMING_DAYS = 30

/** Berechnet Kennzahlen über Termine, To-dos und Notizen für die Statistik-Seite. */
export function computeStats(
  events: CalendarEvent[],
  todos: Todo[],
  notes: Note[],
  today: Date = new Date(),
): Stats {
  const fromIso = isoDate(today)
  const horizon = isoDate(new Date(today.getTime() + UPCOMING_DAYS * 86_400_000))

  const byCategory: CategoryCount[] = EVENT_COLORS.map((c) => ({
    key: c.key,
    count: events.filter((e) => (e.color ?? 'gold') === c.key).length,
  }))

  const upcoming = events.filter((e) => {
    const occ = nextOccurrence(e, fromIso)
    return occ !== null && occ <= horizon
  }).length

  return {
    todos: {
      open: todos.filter((t) => !t.done).length,
      done: todos.filter((t) => t.done).length,
      recurring: todos.filter((t) => t.repeat !== undefined).length,
    },
    events: {
      total: events.length,
      recurring: events.filter((e) => e.repeat !== undefined).length,
      upcoming,
      byCategory,
    },
    notes: {
      count: notes.length,
      words: notes.reduce((sum, n) => sum + wordCount(n.content), 0),
      withLinks: notes.filter((n) => extractWikiLinks(n.content).length > 0).length,
    },
  }
}
