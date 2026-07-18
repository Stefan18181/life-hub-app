import type { CalendarEvent } from './events'

/** Escaped Text für iCalendar-Werte (RFC 5545: \\ ; , und Zeilenumbrüche). */
export function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** "2026-07-15" → "20260715" */
function icsDate(iso: string): string {
  return iso.replace(/-/g, '')
}

/** "2026-07-15" + "17:30" → "20260715T173000" (lokale, "floating" Zeit) */
function icsDateTime(iso: string, time: string): string {
  return `${icsDate(iso)}T${time.replace(':', '')}00`
}

/** ISO-Datum + n Tage (für das exklusive DTEND ganztägiger Termine). */
function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00')
  d.setDate(d.getDate() + days)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const RRULE_FREQ: Record<string, string> = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
}

/** Faltet lange Zeilen gemäß RFC 5545 (max. 75 Zeichen, Fortsetzung mit Leerzeichen). */
function foldLine(line: string): string[] {
  if (line.length <= 74) return [line]
  const parts: string[] = [line.slice(0, 74)]
  for (let i = 74; i < line.length; i += 73) {
    parts.push(' ' + line.slice(i, i + 73))
  }
  return parts
}

/**
 * Baut eine iCalendar-Datei (RFC 5545) aus den Terminen.
 * Ganztägige Termine als DATE, Termine mit Uhrzeit als lokale Zeit,
 * Wiederholungen als RRULE, ausgenommene Tage als EXDATE.
 */
export function buildICS(events: CalendarEvent[], now: Date = new Date()): string {
  const stamp = icsDateTime(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
  )

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Life Hub//DE',
    'CALSCALE:GREGORIAN',
  ]

  for (const e of events) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${e.id}@life-hub`)
    lines.push(`DTSTAMP:${stamp}`)
    lines.push(`SUMMARY:${escapeICS(e.title)}`)

    if (e.time) {
      lines.push(`DTSTART:${icsDateTime(e.date, e.time)}`)
    } else {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(e.date)}`)
      // DTEND ist bei DATE-Werten exklusiv → letzter Tag + 1
      const lastDay = !e.repeat && e.endDate && e.endDate > e.date ? e.endDate : e.date
      lines.push(`DTEND;VALUE=DATE:${icsDate(addDays(lastDay, 1))}`)
    }

    if (e.repeat) {
      lines.push(`RRULE:FREQ=${RRULE_FREQ[e.repeat]}`)
      for (const ex of e.except ?? []) {
        lines.push(
          e.time
            ? `EXDATE:${icsDateTime(ex, e.time)}`
            : `EXDATE;VALUE=DATE:${icsDate(ex)}`,
        )
      }
    }

    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.flatMap(foldLine).join('\r\n') + '\r\n'
}
