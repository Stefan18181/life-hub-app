import { describe, expect, it } from 'vitest'
import { buildSystemPrompt } from './claude'
import type { CalendarEvent } from './events'
import type { Note } from './notes'

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
