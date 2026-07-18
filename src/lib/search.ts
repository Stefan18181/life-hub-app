import type { CalendarEvent } from './events'
import { extractTags, type Note } from './notes'
import type { Todo } from './todos'

export interface SearchData {
  events: CalendarEvent[]
  todos: Todo[]
  notes: Note[]
}

export interface SearchResults {
  events: CalendarEvent[]
  todos: Todo[]
  notes: Note[]
  total: number
}

/**
 * Durchsucht Termine (Titel), To-dos (Text) und Notizen (Titel + Inhalt)
 * nach einem Suchbegriff (Groß-/Kleinschreibung egal). Leere Anfrage → keine Treffer.
 * Beginnt die Anfrage mit „#", wird gezielt nach Notiz-Tags gesucht.
 */
export function search(query: string, data: SearchData): SearchResults {
  const q = query.trim().toLowerCase()
  if (!q) return { events: [], todos: [], notes: [], total: 0 }

  // Tag-Suche: „#arbeit" findet nur Notizen mit passendem Tag.
  if (q.startsWith('#')) {
    const tagQ = q.slice(1)
    const notes = tagQ
      ? data.notes.filter((n) => extractTags(n.content).some((t) => t.includes(tagQ)))
      : []
    return { events: [], todos: [], notes, total: notes.length }
  }

  const events = data.events.filter((e) => e.title.toLowerCase().includes(q))
  const todos = data.todos.filter((t) => t.text.toLowerCase().includes(q))
  const notes = data.notes.filter(
    (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
  )
  return { events, todos, notes, total: events.length + todos.length + notes.length }
}

/** Kurzer Kontext-Ausschnitt aus einem Text rund um den Treffer (für Notizen). */
export function snippet(content: string, query: string, radius = 30): string {
  const q = query.trim().toLowerCase()
  const idx = q ? content.toLowerCase().indexOf(q) : -1
  if (idx < 0) return content.slice(0, radius * 2).trim()
  const start = Math.max(0, idx - radius)
  const end = Math.min(content.length, idx + q.length + radius)
  return (
    (start > 0 ? '… ' : '') +
    content.slice(start, end).trim() +
    (end < content.length ? ' …' : '')
  )
}
