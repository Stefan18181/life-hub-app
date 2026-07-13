import { beforeEach, describe, expect, it } from 'vitest'
import {
  addEvent,
  eventsOn,
  loadEvents,
  removeEvent,
  saveEvents,
  type CalendarEvent,
} from './events'

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
