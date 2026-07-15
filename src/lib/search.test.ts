import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from './events'
import type { Note } from './notes'
import { search, snippet } from './search'
import type { Todo } from './todos'

const events: CalendarEvent[] = [
  { id: 'e1', date: '2026-07-16', title: 'Zahnarzt Termin', time: '09:00' },
  { id: 'e2', date: '2026-07-17', title: 'Sport' },
]
const todos: Todo[] = [
  { id: 't1', text: 'Zahnpasta kaufen', done: false, createdAt: '2026-07-13T10:00:00Z' },
  { id: 't2', text: 'Rechnung zahlen', done: true, createdAt: '2026-07-13T09:00:00Z' },
]
const notes: Note[] = [
  { id: 'n1', title: 'Gesundheit', content: 'Nächster Zahnarzt-Check im Herbst', updatedAt: '2026-07-13T10:00:00Z' },
  { id: 'n2', title: 'Urlaub', content: 'Packliste', updatedAt: '2026-07-12T10:00:00Z' },
]

describe('search', () => {
  it('findet über alle drei Bereiche und zählt die Treffer', () => {
    const r = search('zahn', { events, todos, notes })
    expect(r.events.map((e) => e.id)).toEqual(['e1'])
    expect(r.todos.map((t) => t.id)).toEqual(['t1'])
    expect(r.notes.map((n) => n.id)).toEqual(['n1'])
    expect(r.total).toBe(3)
  })

  it('durchsucht Notizen in Titel UND Inhalt', () => {
    expect(search('urlaub', { events, todos, notes }).notes.map((n) => n.id)).toEqual(['n2'])
    expect(search('packliste', { events, todos, notes }).notes.map((n) => n.id)).toEqual(['n2'])
  })

  it('ignoriert Groß-/Kleinschreibung und liefert bei leerer Anfrage nichts', () => {
    expect(search('SPORT', { events, todos, notes }).events.map((e) => e.id)).toEqual(['e2'])
    expect(search('   ', { events, todos, notes }).total).toBe(0)
  })
})

describe('snippet', () => {
  it('schneidet Kontext um den Treffer herum aus', () => {
    const s = snippet('Nächster Zahnarzt-Check im Herbst', 'zahnarzt', 8)
    expect(s).toContain('Zahnarzt')
    expect(s.startsWith('…')).toBe(true)
    expect(s.endsWith('…')).toBe(true)
  })

  it('gibt ohne Treffer den Anfang zurück', () => {
    expect(snippet('Kurzer Text', 'xyz', 4)).toBe('Kurzer T')
  })
})
