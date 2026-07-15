import { beforeEach, describe, expect, it } from 'vitest'
import {
  addEvent,
  eventsOn,
  loadEvents,
  nextEvent,
  nextOccurrence,
  occursOn,
  removeEvent,
  saveEvents,
  type CalendarEvent,
} from './events'

function ev(date: string, title: string, repeat?: CalendarEvent['repeat']): CalendarEvent {
  return { id: date + title, date, title, repeat }
}

describe('addEvent', () => {
  it('vergibt eine ID und sortiert nach Datum und Uhrzeit', () => {
    let events: CalendarEvent[] = []
    events = addEvent(events, { date: '2026-07-14', title: 'Zahnarzt', time: '09:00' })
    events = addEvent(events, { date: '2026-07-13', title: 'Sport' })
    events = addEvent(events, { date: '2026-07-14', title: 'Frühstück', time: '08:00' })

    expect(events.map((e) => e.title)).toEqual(['Sport', 'Frühstück', 'Zahnarzt'])
    expect(new Set(events.map((e) => e.id)).size).toBe(3)
  })
})

describe('removeEvent / eventsOn', () => {
  it('entfernt nur den passenden Termin und filtert nach Tag', () => {
    let events: CalendarEvent[] = []
    events = addEvent(events, { date: '2026-07-13', title: 'A' })
    events = addEvent(events, { date: '2026-07-13', title: 'B' })
    events = addEvent(events, { date: '2026-07-14', title: 'C' })

    events = removeEvent(events, events[0].id)
    expect(events).toHaveLength(2)
    expect(eventsOn(events, '2026-07-13').map((e) => e.title)).toEqual(['B'])
  })
})

describe('nextEvent', () => {
  it('liefert den frühesten Termin ab heute und ignoriert vergangene', () => {
    let events: CalendarEvent[] = []
    events = addEvent(events, { date: '2026-07-10', title: 'Vorbei' })
    events = addEvent(events, { date: '2026-07-16', title: 'Friseur', time: '17:30' })
    events = addEvent(events, { date: '2026-07-16', title: 'Frühsport', time: '07:00' })
    events = addEvent(events, { date: '2026-07-20', title: 'Später' })

    const next = nextEvent(events, '2026-07-14')
    expect(next?.title).toBe('Frühsport')
  })

  it('zählt den heutigen Tag mit und liefert null, wenn nichts ansteht', () => {
    const events = addEvent([], { date: '2026-07-14', title: 'Heute' })
    expect(nextEvent(events, '2026-07-14')?.title).toBe('Heute')
    expect(nextEvent(events, '2026-07-15')).toBeNull()
  })
})

describe('occursOn', () => {
  it('einmalige Termine nur am eigenen Datum', () => {
    const e = ev('2026-07-15', 'X')
    expect(occursOn(e, '2026-07-15')).toBe(true)
    expect(occursOn(e, '2026-07-16')).toBe(false)
    expect(occursOn(e, '2026-07-14')).toBe(false)
  })

  it('täglich ab Startdatum an jedem Tag', () => {
    const e = ev('2026-07-15', 'Sport', 'daily')
    expect(occursOn(e, '2026-07-20')).toBe(true)
    expect(occursOn(e, '2026-07-14')).toBe(false) // vor dem Start
  })

  it('wöchentlich am selben Wochentag', () => {
    const e = ev('2026-07-15', 'Meeting', 'weekly') // Mittwoch
    expect(occursOn(e, '2026-07-22')).toBe(true) // +7
    expect(occursOn(e, '2026-07-29')).toBe(true) // +14
    expect(occursOn(e, '2026-07-21')).toBe(false)
  })

  it('monatlich am selben Tag des Monats', () => {
    const e = ev('2026-07-15', 'Miete', 'monthly')
    expect(occursOn(e, '2026-08-15')).toBe(true)
    expect(occursOn(e, '2026-09-15')).toBe(true)
    expect(occursOn(e, '2026-08-16')).toBe(false)
  })
})

describe('nextOccurrence', () => {
  it('einmalig: Datum wenn in der Zukunft, sonst null', () => {
    expect(nextOccurrence(ev('2026-07-20', 'X'), '2026-07-15')).toBe('2026-07-20')
    expect(nextOccurrence(ev('2026-07-10', 'X'), '2026-07-15')).toBeNull()
  })

  it('wöchentlich: nächste Wiederholung ab Datum', () => {
    // Start Mi 15.07., ab 20.07. → nächster Mittwoch ist 22.07.
    expect(nextOccurrence(ev('2026-07-15', 'M', 'weekly'), '2026-07-20')).toBe('2026-07-22')
  })

  it('täglich: heute, wenn bereits gestartet', () => {
    expect(nextOccurrence(ev('2026-07-01', 'S', 'daily'), '2026-07-15')).toBe('2026-07-15')
  })
})

describe('eventsOn / nextEvent mit Wiederholung', () => {
  it('eventsOn zeigt wiederkehrende Termine an Wiederholungstagen', () => {
    const events = [ev('2026-07-15', 'Sport', 'daily'), ev('2026-07-16', 'Einmalig')]
    expect(eventsOn(events, '2026-07-20').map((e) => e.title)).toEqual(['Sport'])
  })

  it('nextEvent liefert die nächste Wiederholung mit deren Datum', () => {
    const next = nextEvent([ev('2026-07-01', 'Standup', 'weekly')], '2026-07-15')
    // Start Mi 01.07 → Mittwoche: 15.07 ist selbst ein Mittwoch
    expect(next?.title).toBe('Standup')
    expect(next?.date).toBe('2026-07-15')
  })
})

describe('loadEvents / saveEvents', () => {
  beforeEach(() => localStorage.clear())

  it('lädt gespeicherte Termine zurück', () => {
    const events = addEvent([], { date: '2026-07-13', title: 'Test' })
    saveEvents(events)
    expect(loadEvents()).toEqual(events)
  })

  it('ignoriert kaputte oder fremde Daten', () => {
    localStorage.setItem('life-hub.events.v1', 'kein json {')
    expect(loadEvents()).toEqual([])
    localStorage.setItem('life-hub.events.v1', JSON.stringify([{ falsch: true }, null]))
    expect(loadEvents()).toEqual([])
  })
})
