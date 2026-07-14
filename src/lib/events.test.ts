import { beforeEach, describe, expect, it } from 'vitest'
import {
  addEvent,
  eventsOn,
  loadEvents,
  nextEvent,
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
