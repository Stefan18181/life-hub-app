import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from './events'
import type { Note } from './notes'
import type { Todo } from './todos'
import { computeStats, wordCount } from './stats'

const today = new Date('2026-07-18T12:00:00')

function todo(id: string, done: boolean, repeat?: 'daily' | 'weekly' | 'monthly'): Todo {
  return { id, text: id, done, createdAt: '2026-07-01T00:00:00Z', ...(repeat ? { repeat, due: '2026-07-18' } : {}) }
}

function note(id: string, content: string): Note {
  return { id, title: id, content, updatedAt: '2026-07-01T00:00:00Z' }
}

describe('wordCount', () => {
  it('zählt Wörter und behandelt Leerraum', () => {
    expect(wordCount('  hallo   welt \n test ')).toBe(3)
    expect(wordCount('   ')).toBe(0)
  })
})

describe('computeStats', () => {
  it('zählt To-dos nach Status und Wiederholung', () => {
    const todos = [todo('a', false), todo('b', true), todo('c', false, 'weekly')]
    const stats = computeStats([], todos, [], today)
    expect(stats.todos).toEqual({ open: 2, done: 1, recurring: 1 })
  })

  it('zählt Termine, Wiederholungen, kommende 30 Tage und pro Kategorie', () => {
    const events: CalendarEvent[] = [
      { id: '1', date: '2026-07-20', title: 'bald' }, // gold, in 2 Tagen
      { id: '2', date: '2026-07-01', title: 'wöchentlich', repeat: 'weekly' }, // läuft weiter
      { id: '3', date: '2026-09-01', title: 'fern', color: 'blue' }, // > 30 Tage
    ]
    const stats = computeStats(events, [], [], today)
    expect(stats.events.total).toBe(3)
    expect(stats.events.recurring).toBe(1)
    expect(stats.events.upcoming).toBe(2) // gold-Termin + laufende Wiederholung, nicht der ferne
    const gold = stats.events.byCategory.find((c) => c.key === 'gold')!
    const blue = stats.events.byCategory.find((c) => c.key === 'blue')!
    expect(gold.count).toBe(2)
    expect(blue.count).toBe(1)
  })

  it('zählt Notizen, Wörter und solche mit Wikilinks', () => {
    const notes = [note('a', 'ein zwei drei'), note('b', 'siehe [[a]]'), note('c', '')]
    const stats = computeStats([], [], notes, today)
    expect(stats.notes).toEqual({ count: 3, words: 5, withLinks: 1 })
  })
})
