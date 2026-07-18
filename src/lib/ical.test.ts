import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from './events'
import { buildICS, escapeICS } from './ical'

const now = new Date(2026, 6, 15, 12, 0)

function build(events: CalendarEvent[]): string {
  return buildICS(events, now)
}

describe('escapeICS', () => {
  it('escaped Sonderzeichen und Zeilenumbrüche', () => {
    expect(escapeICS('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne')
  })
})

describe('buildICS', () => {
  it('erzeugt einen gültigen Kalender-Rahmen mit CRLF', () => {
    const ics = build([])
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('VERSION:2.0')
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
  })

  it('ganztägiger Termin: DATE-Werte mit exklusivem DTEND', () => {
    const ics = build([{ id: 'a', date: '2026-07-20', title: 'Geburtstag' }])
    expect(ics).toContain('DTSTART;VALUE=DATE:20260720')
    expect(ics).toContain('DTEND;VALUE=DATE:20260721')
    expect(ics).toContain('SUMMARY:Geburtstag')
    expect(ics).toContain('UID:a@life-hub')
  })

  it('Termin mit Uhrzeit: lokale DTSTART ohne DTEND', () => {
    const ics = build([{ id: 'b', date: '2026-07-20', title: 'Meeting', time: '09:30' }])
    expect(ics).toContain('DTSTART:20260720T093000')
    expect(ics).not.toContain('DTEND')
  })

  it('mehrtägiger Termin: DTEND = Endtag + 1', () => {
    const ics = build([{ id: 'c', date: '2026-07-20', endDate: '2026-07-24', title: 'Urlaub' }])
    expect(ics).toContain('DTSTART;VALUE=DATE:20260720')
    expect(ics).toContain('DTEND;VALUE=DATE:20260725')
  })

  it('Wiederholung: RRULE und EXDATE (ganztägig und mit Uhrzeit)', () => {
    const ics = build([
      { id: 'd', date: '2026-07-06', title: 'Yoga', repeat: 'weekly', except: ['2026-07-13'] },
      { id: 'e', date: '2026-07-01', title: 'Standup', time: '09:00', repeat: 'daily', except: ['2026-07-02'] },
    ])
    expect(ics).toContain('RRULE:FREQ=WEEKLY')
    expect(ics).toContain('EXDATE;VALUE=DATE:20260713')
    expect(ics).toContain('RRULE:FREQ=DAILY')
    expect(ics).toContain('EXDATE:20260702T090000')
  })

  it('faltet überlange Zeilen (RFC 5545)', () => {
    const ics = build([{ id: 'f', date: '2026-07-20', title: 'X'.repeat(200) }])
    for (const line of ics.split('\r\n')) {
      expect(line.length).toBeLessThanOrEqual(75)
    }
  })
})
