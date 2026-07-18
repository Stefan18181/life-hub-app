import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from './events'
import { buildICS, escapeICS, parseICS } from './ical'

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

function vcal(body: string): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', body, 'END:VCALENDAR'].join('\r\n')
}

describe('parseICS', () => {
  it('liest einen ganztägigen Termin', () => {
    const events = parseICS(vcal(
      'BEGIN:VEVENT\r\nSUMMARY:Geburtstag\r\nDTSTART;VALUE=DATE:20260720\r\nDTEND;VALUE=DATE:20260721\r\nEND:VEVENT',
    ))
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ date: '2026-07-20', title: 'Geburtstag' })
    expect(events[0].time).toBeUndefined()
    expect(events[0].endDate).toBeUndefined()
    expect(events[0].id).toBeTruthy()
  })

  it('liest Uhrzeit aus DATETIME-Werten', () => {
    const events = parseICS(vcal(
      'BEGIN:VEVENT\r\nSUMMARY:Meeting\r\nDTSTART:20260720T093000\r\nEND:VEVENT',
    ))
    expect(events[0]).toMatchObject({ date: '2026-07-20', time: '09:30', title: 'Meeting' })
  })

  it('mehrtägig: exklusives DTEND wird zum letzten Tag', () => {
    const events = parseICS(vcal(
      'BEGIN:VEVENT\r\nSUMMARY:Urlaub\r\nDTSTART;VALUE=DATE:20260720\r\nDTEND;VALUE=DATE:20260725\r\nEND:VEVENT',
    ))
    expect(events[0]).toMatchObject({ date: '2026-07-20', endDate: '2026-07-24' })
  })

  it('liest RRULE und mehrere EXDATE-Werte', () => {
    const events = parseICS(vcal(
      'BEGIN:VEVENT\r\nSUMMARY:Standup\r\nDTSTART:20260701T090000\r\n' +
        'RRULE:FREQ=DAILY;INTERVAL=1\r\nEXDATE:20260702T090000,20260703T090000\r\n' +
        'EXDATE;VALUE=DATE:20260706\r\nEND:VEVENT',
    ))
    expect(events[0]).toMatchObject({
      repeat: 'daily',
      except: ['2026-07-02', '2026-07-03', '2026-07-06'],
    })
  })

  it('unbekannte FREQ wird als einmaliger Termin importiert', () => {
    const events = parseICS(vcal(
      'BEGIN:VEVENT\r\nSUMMARY:Jahrestag\r\nDTSTART;VALUE=DATE:20260720\r\nRRULE:FREQ=YEARLY\r\nEND:VEVENT',
    ))
    expect(events[0].repeat).toBeUndefined()
  })

  it('entfernt Escaping und entfaltet gefaltete Zeilen', () => {
    const events = parseICS(vcal(
      'BEGIN:VEVENT\r\nSUMMARY:Kaffee\\, Kuchen\\; Torte \r\n mit Sahne\r\nDTSTART;VALUE=DATE:20260720\r\nEND:VEVENT',
    ))
    expect(events[0].title).toBe('Kaffee, Kuchen; Torte mit Sahne')
  })

  it('überspringt Einträge ohne Titel oder Datum und ignoriert Fremdblöcke', () => {
    const events = parseICS(vcal(
      'BEGIN:VTIMEZONE\r\nTZID:Europe/Berlin\r\nEND:VTIMEZONE\r\n' +
        'BEGIN:VEVENT\r\nSUMMARY:Ohne Datum\r\nEND:VEVENT\r\n' +
        'BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260720\r\nEND:VEVENT\r\n' +
        'BEGIN:VEVENT\r\nSUMMARY:Gültig\r\nDTSTART;VALUE=DATE:20260721\r\nEND:VEVENT',
    ))
    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Gültig')
  })

  it('Roundtrip: buildICS → parseICS erhält die Kernfelder', () => {
    const original: CalendarEvent[] = [
      { id: 'a', date: '2026-07-20', title: 'Geburtstag' },
      { id: 'b', date: '2026-07-20', endDate: '2026-07-24', title: 'Urlaub' },
      { id: 'c', date: '2026-07-01', title: 'Standup', time: '09:00', repeat: 'daily', except: ['2026-07-02'] },
    ]
    const parsed = parseICS(build(original))
    expect(parsed.map(({ id: _id, ...rest }) => rest)).toEqual(
      original.map(({ id: _id, ...rest }) => rest),
    )
  })
})
