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

/** Macht das Escaping von escapeICS rückgängig. */
function unescapeICS(text: string): string {
  return text.replace(/\\(.)/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c))
}

/** "20260715" → "2026-07-15"; ungültige Werte → null */
function parseIcsDate(value: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

/** "20260715T093000" → "09:30"; reine DATE-Werte → undefined */
function parseIcsTime(value: string): string | undefined {
  const m = /^\d{8}T(\d{2})(\d{2})/.exec(value)
  return m ? `${m[1]}:${m[2]}` : undefined
}

const IMPORT_FREQ: Record<string, CalendarEvent['repeat']> = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
}

interface RawProp {
  name: string
  params: string[]
  value: string
}

/** Zerlegt eine entfaltete Content-Zeile in Name, Parameter und Wert. */
function parseProp(line: string): RawProp | null {
  const colon = line.indexOf(':')
  if (colon < 0) return null
  const [name, ...params] = line.slice(0, colon).split(';')
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) }
}

/**
 * Liest Termine aus einer iCalendar-Datei (RFC 5545).
 * Unterstützt ganztägige, mehrtägige und zeitgebundene Termine sowie
 * RRULE (täglich/wöchentlich/monatlich) und EXDATE. Zeitzonen-Angaben
 * werden ignoriert (Zeiten werden als lokale Zeit übernommen);
 * unbekannte Wiederholungsregeln werden als einmaliger Termin importiert.
 */
export function parseICS(ics: string): CalendarEvent[] {
  // Gefaltete Zeilen (RFC 5545) wieder zusammensetzen
  const lines = ics.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)

  const events: CalendarEvent[] = []
  let current: RawProp[] | null = null

  for (const line of lines) {
    const upper = line.trim().toUpperCase()
    if (upper === 'BEGIN:VEVENT') {
      current = []
      continue
    }
    if (upper === 'END:VEVENT') {
      if (current) {
        const event = buildEventFromProps(current)
        if (event) events.push(event)
      }
      current = null
      continue
    }
    if (current) {
      const prop = parseProp(line)
      if (prop) current.push(prop)
    }
  }

  return events
}

function buildEventFromProps(props: RawProp[]): CalendarEvent | null {
  const find = (name: string) => props.find((p) => p.name === name)

  const dtstart = find('DTSTART')
  if (!dtstart) return null
  const date = parseIcsDate(dtstart.value)
  if (!date) return null

  const summary = find('SUMMARY')
  const title = summary ? unescapeICS(summary.value).trim() : ''
  if (!title) return null

  const time = parseIcsTime(dtstart.value)

  const event: CalendarEvent = { id: crypto.randomUUID(), date, title }
  if (time) event.time = time

  const rrule = find('RRULE')
  if (rrule) {
    const freq = /(?:^|;)FREQ=([A-Z]+)/i.exec(rrule.value)?.[1]?.toUpperCase()
    const repeat = freq ? IMPORT_FREQ[freq] : undefined
    if (repeat) event.repeat = repeat
  }

  if (event.repeat) {
    const except: string[] = []
    for (const p of props) {
      if (p.name !== 'EXDATE') continue
      for (const v of p.value.split(',')) {
        const ex = parseIcsDate(v.trim())
        if (ex) except.push(ex)
      }
    }
    if (except.length) event.except = except
  } else if (!time) {
    // DTEND ist bei DATE-Werten exklusiv → letzter Tag = DTEND − 1
    const dtend = find('DTEND')
    const end = dtend ? parseIcsDate(dtend.value) : null
    if (end) {
      const lastDay = parseIcsTime(dtend!.value) ? end : addDays(end, -1)
      if (lastDay > date) event.endDate = lastDay
    }
  }

  return event
}
