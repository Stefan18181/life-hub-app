import { beforeEach, describe, expect, it } from 'vitest'
import { buildSystemPrompt, runEventTool, runNoteTool, runTodoTool, runTool } from './claude'
import { loadEvents, saveEvents, type CalendarEvent } from './events'
import { loadNotes, type Note } from './notes'
import { loadTodos, saveTodos, type Todo } from './todos'

const today = new Date(2026, 6, 13) // 13. Juli 2026

function event(date: string, title: string, time?: string): CalendarEvent {
  return { id: date + title, date, title, time }
}

function note(title: string): Note {
  return { id: title, title, content: '', updatedAt: '2026-07-13T10:00:00Z' }
}

describe('buildSystemPrompt', () => {
  it('enthält Termine der nächsten 14 Tage, aber keine älteren oder späteren', () => {
    const prompt = buildSystemPrompt(
      [
        event('2026-07-12', 'Gestern'),
        event('2026-07-14', 'Zahnarzt', '09:30'),
        event('2026-07-27', 'Grenzfall'),
        event('2026-08-01', 'Zu spät'),
      ],
      [],
      today,
    )
    expect(prompt).toContain('2026-07-14 09:30 Uhr: Zahnarzt')
    expect(prompt).toContain('Grenzfall')
    expect(prompt).not.toContain('Gestern')
    expect(prompt).not.toContain('Zu spät')
  })

  it('listet Notiz-Titel und markiert leere Zustände', () => {
    const withNotes = buildSystemPrompt([], [note('Wochenplan')], today)
    expect(withNotes).toContain('- Wochenplan')
    expect(withNotes).toContain('(keine Termine in den nächsten 14 Tagen)')

    const empty = buildSystemPrompt([], [], today)
    expect(empty).toContain('(keine Notizen vorhanden)')
  })

  it('nennt das heutige Datum', () => {
    expect(buildSystemPrompt([], [], today)).toContain('13. Juli 2026')
  })
})

describe('runEventTool: add_event', () => {
  beforeEach(() => localStorage.clear())

  it('legt einen Termin mit Uhrzeit im localStorage an', () => {
    const outcome = runEventTool('add_event', {
      date: '2026-07-16',
      title: 'Friseur',
      time: '17:30',
    })
    expect(outcome.isError).toBe(false)
    expect(loadEvents()).toEqual([
      { id: expect.any(String), date: '2026-07-16', title: 'Friseur', time: '17:30' },
    ])
  })

  it('akzeptiert Termine ohne Uhrzeit und lässt time weg', () => {
    runEventTool('add_event', { date: '2026-07-16', title: 'Sport' })
    expect(loadEvents()[0].time).toBeUndefined()
  })

  it('lehnt ungültiges Datum, leeren Titel und falsche Uhrzeit ab', () => {
    expect(runEventTool('add_event', { date: '16.07.2026', title: 'X' }).isError).toBe(true)
    expect(runEventTool('add_event', { date: '2026-07-16', title: '  ' }).isError).toBe(true)
    expect(runEventTool('add_event', { date: '2026-07-16', title: 'X', time: '25:00' }).isError).toBe(
      true,
    )
    expect(loadEvents()).toEqual([])
  })
})

describe('runEventTool: remove_event', () => {
  beforeEach(() => {
    localStorage.clear()
    const seed: CalendarEvent[] = [
      { id: 'a', date: '2026-07-16', title: 'Friseur', time: '17:30' },
      { id: 'b', date: '2026-07-16', title: 'Zahnarzt', time: '09:00' },
      { id: 'c', date: '2026-07-17', title: 'Friseur' },
    ]
    saveEvents(seed)
  })

  it('löscht mit Titelfilter nur den passenden Termin des Tages', () => {
    const outcome = runEventTool('remove_event', { date: '2026-07-16', title: 'friseur' })
    expect(outcome.isError).toBe(false)
    expect(loadEvents().map((e) => e.id)).toEqual(['b', 'c'])
  })

  it('löscht ohne Titel alle Termine des Tages', () => {
    runEventTool('remove_event', { date: '2026-07-16' })
    expect(loadEvents().map((e) => e.id)).toEqual(['c'])
  })

  it('meldet ohne Fehler, wenn nichts passt', () => {
    const outcome = runEventTool('remove_event', { date: '2026-07-20' })
    expect(outcome.isError).toBe(false)
    expect(loadEvents()).toHaveLength(3)
  })
})

describe('runTodoTool', () => {
  beforeEach(() => localStorage.clear())

  function seed(todos: Todo[]) {
    saveTodos(todos)
  }

  it('legt eine Aufgabe an und lehnt leeren Text ab', () => {
    expect(runTodoTool('add_todo', { text: '  Milch kaufen ' }).isError).toBe(false)
    expect(loadTodos().map((t) => t.text)).toEqual(['Milch kaufen'])
    expect(runTodoTool('add_todo', { text: '   ' }).isError).toBe(true)
    expect(loadTodos()).toHaveLength(1)
  })

  it('hakt nur offene, passende Aufgaben ab', () => {
    seed([
      { id: 'a', text: 'Milch kaufen', done: false, createdAt: '2026-07-13T10:00:00Z' },
      { id: 'b', text: 'Brot kaufen', done: false, createdAt: '2026-07-13T09:00:00Z' },
    ])
    const outcome = runTodoTool('complete_todo', { text: 'milch' })
    expect(outcome.isError).toBe(false)
    const byId = Object.fromEntries(loadTodos().map((t) => [t.id, t.done]))
    expect(byId).toEqual({ a: true, b: false })
  })

  it('löscht passende Aufgaben und meldet ohne Fehler, wenn nichts passt', () => {
    seed([{ id: 'a', text: 'Milch kaufen', done: false, createdAt: '2026-07-13T10:00:00Z' }])
    expect(runTodoTool('remove_todo', { text: 'milch' }).isError).toBe(false)
    expect(loadTodos()).toEqual([])
    expect(runTodoTool('remove_todo', { text: 'gibtsnicht' }).isError).toBe(false)
  })
})

describe('runNoteTool', () => {
  beforeEach(() => localStorage.clear())

  it('legt eine Notiz mit Inhalt an und lehnt leeren Titel ab', () => {
    expect(runNoteTool('create_note', { title: 'Ideen', content: '# Plan' }).isError).toBe(false)
    const notes = loadNotes()
    expect(notes.map((n) => n.title)).toEqual(['Ideen'])
    expect(notes[0].content).toBe('# Plan')
    expect(runNoteTool('create_note', { title: '  ' }).isError).toBe(true)
  })

  it('hängt Text an eine bestehende Notiz an (per Titel gefunden)', () => {
    runNoteTool('create_note', { title: 'Einkauf', content: 'Milch' })
    const outcome = runNoteTool('append_to_note', { title: 'einkauf', text: 'Brot' })
    expect(outcome.isError).toBe(false)
    expect(loadNotes()[0].content).toBe('Milch\n\nBrot')
  })

  it('legt bei append_to_note eine neue Notiz an, wenn der Titel fehlt', () => {
    const outcome = runNoteTool('append_to_note', { title: 'Neu', text: 'Erster Eintrag' })
    expect(outcome.isError).toBe(false)
    const notes = loadNotes()
    expect(notes.map((n) => n.title)).toEqual(['Neu'])
    expect(notes[0].content).toBe('Erster Eintrag')
  })
})

describe('runTool: Dispatcher', () => {
  beforeEach(() => localStorage.clear())

  it('leitet To-do-, Termin- und Notiz-Werkzeuge korrekt weiter', () => {
    runTool('add_todo', { text: 'Sport' })
    expect(loadTodos().map((t) => t.text)).toEqual(['Sport'])
    runTool('add_event', { date: '2026-07-16', title: 'Friseur' })
    expect(loadEvents().map((e) => e.title)).toEqual(['Friseur'])
    runTool('create_note', { title: 'Notiz X' })
    expect(loadNotes().map((n) => n.title)).toEqual(['Notiz X'])
  })
})
