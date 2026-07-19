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

  it('sucht mit führendem # gezielt nach Notiz-Tags', () => {
    const tagged: Note[] = [
      { id: 'a', title: 'A', content: 'Text #arbeit hier', updatedAt: '2026-07-13T10:00:00Z' },
      { id: 'b', title: 'B', content: 'nur #privat', updatedAt: '2026-07-12T10:00:00Z' },
      { id: 'c', title: 'arbeit', content: 'ohne Tag, aber arbeit im Text', updatedAt: '2026-07-11T10:00:00Z' },
    ]
    const r = search('#arbeit', { events, todos, notes: tagged })
    // nur die per Tag markierte Notiz, nicht die mit "arbeit" nur im Text
    expect(r.notes.map((n) => n.id)).toEqual(['a'])
    expect(r.events).toEqual([])
    expect(r.todos).toEqual([])
    expect(r.total).toBe(1)
  })

  it('# allein liefert keine Treffer, Präfix matcht Tags', () => {
    const tagged: Note[] = [
      { id: 'a', title: 'A', content: '#arbeitsplatz', updatedAt: '2026-07-13T10:00:00Z' },
    ]
    expect(search('#', { events, todos, notes: tagged }).total).toBe(0)
    expect(search('#arbeit', { events, todos, notes: tagged }).notes.map((n) => n.id)).toEqual(['a'])
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
