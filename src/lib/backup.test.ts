import { beforeEach, describe, expect, it } from 'vitest'
import { saveCategoryNames } from './categories'
import { saveEvents } from './events'
import { saveNotes } from './notes'
import { saveTodos } from './todos'
import { applyBackup, buildBackup, parseBackup } from './backup'

describe('buildBackup / parseBackup / applyBackup', () => {
  beforeEach(() => localStorage.clear())

  it('Roundtrip: exportiert und importiert alle Daten', () => {
    saveEvents([{ id: 'e1', date: '2026-07-20', title: 'Termin' }])
    saveTodos([{ id: 't1', text: 'Aufgabe', done: false, createdAt: '2026-07-01T00:00:00Z' }])
    saveNotes([{ id: 'n1', title: 'Notiz', content: 'Inhalt', updatedAt: '2026-07-01T00:00:00Z' }])
    saveCategoryNames({ blue: 'Arbeit' })

    const backup = buildBackup(new Date('2026-07-18T12:00:00Z'))
    expect(backup.app).toBe('life-hub')
    expect(backup.exportedAt).toBe('2026-07-18T12:00:00.000Z')

    const json = JSON.stringify(backup)
    localStorage.clear()

    const data = parseBackup(json)
    const result = applyBackup(data)
    expect(result).toEqual({ events: 1, todos: 1, notes: 1 })

    const restored = buildBackup()
    expect(restored.events[0].title).toBe('Termin')
    expect(restored.todos[0].text).toBe('Aufgabe')
    expect(restored.notes[0].title).toBe('Notiz')
    expect(restored.categories.blue).toBe('Arbeit')
  })

  it('lehnt fremde oder kaputte Dateien ab', () => {
    expect(() => parseBackup('kein json {')).toThrow()
    expect(() => parseBackup(JSON.stringify({ foo: 'bar' }))).toThrow(/Life-Hub/)
  })

  it('überspringt strukturell ungültige Einträge', () => {
    const json = JSON.stringify({
      app: 'life-hub',
      version: 1,
      events: [{ id: 'ok', date: '2026-07-20', title: 'Gut' }, { id: 'x' }, null],
      todos: [{ id: 't', text: 'A', done: false, createdAt: '2026-07-01T00:00:00Z' }, { text: 'kaputt' }],
      notes: 'keine Liste',
      categories: { blue: 'Arbeit', bad: 5 },
    })
    const data = parseBackup(json)
    expect(data.events).toHaveLength(1)
    expect(data.todos).toHaveLength(1)
    expect(data.notes).toEqual([])
    // categories nur akzeptiert, wenn alle Werte Strings sind
    expect(data.categories).toEqual({})
  })
})
