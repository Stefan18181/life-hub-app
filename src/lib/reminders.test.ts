import { beforeEach, describe, expect, it } from 'vitest'
import type { CalendarEvent, Repeat } from './events'
import {
  dueReminders,
  eventStart,
  loadNotifiedIds,
  reminderKey,
  reminderText,
  saveNotifiedIds,
} from './reminders'

function event(
  id: string,
  date: string,
  title: string,
  time?: string,
  repeat?: Repeat,
): CalendarEvent {
  return { id, date, title, time, repeat }
}

describe('eventStart', () => {
  it('kombiniert Datum und Uhrzeit, null ohne Uhrzeit', () => {
    expect(eventStart(event('a', '2026-07-16', 'X', '17:30'))?.getHours()).toBe(17)
    expect(eventStart(event('b', '2026-07-16', 'X'))).toBeNull()
  })
})

describe('dueReminders', () => {
  const now = new Date('2026-07-16T17:00:00')
  const lead = 30 * 60 * 1000 // 30 Minuten

  it('meldet nur Termine mit Uhrzeit im Zeitfenster', () => {
    const events = [
      event('soon', '2026-07-16', 'Bald', '17:20'), // in 20 min → ja
      event('now', '2026-07-16', 'Jetzt', '17:00'), // genau jetzt → ja
      event('late', '2026-07-16', 'Später', '18:30'), // in 90 min → nein
      event('past', '2026-07-16', 'Vorbei', '16:30'), // vorbei → nein
      event('allday', '2026-07-16', 'Ganztags'), // ohne Uhrzeit → nein
    ]
    expect(dueReminders(events, now, lead, new Set()).map((e) => e.id).sort()).toEqual([
      'now',
      'soon',
    ])
  })

  it('überspringt bereits (heute) benachrichtigte Termine', () => {
    const e = event('soon', '2026-07-16', 'Bald', '17:20')
    expect(dueReminders([e], now, lead, new Set([reminderKey(e, now)]))).toEqual([])
  })

  it('erinnert auch an wiederkehrende Termine an einem Wiederholungstag', () => {
    // Täglicher Termin, gestartet vor Tagen, hat heute um 17:20 eine Wiederholung
    const daily = event('d', '2026-07-01', 'Sport', '17:20', 'daily')
    expect(dueReminders([daily], now, lead, new Set()).map((e) => e.id)).toEqual(['d'])
  })
})

describe('reminderText', () => {
  it('nennt Uhrzeit, wenn vorhanden', () => {
    expect(reminderText(event('a', '2026-07-16', 'Friseur', '17:30'))).toBe('17:30 Uhr – Friseur')
    expect(reminderText(event('b', '2026-07-16', 'Geburtstag'))).toBe('Geburtstag')
  })
})

describe('loadNotifiedIds / saveNotifiedIds', () => {
  beforeEach(() => localStorage.clear())

  it('speichert und lädt IDs zurück', () => {
    saveNotifiedIds(new Set(['a', 'b']))
    expect([...loadNotifiedIds()].sort()).toEqual(['a', 'b'])
  })

  it('verkraftet kaputte Daten', () => {
    localStorage.setItem('life-hub.notified.v1', 'kein json')
    expect(loadNotifiedIds()).toEqual(new Set())
  })
})
