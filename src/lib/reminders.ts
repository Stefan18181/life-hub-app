import type { CalendarEvent } from './events'

/** Kombiniert Datum + Uhrzeit eines Termins zu einem lokalen Date; null ohne (gültige) Uhrzeit. */
export function eventStart(event: CalendarEvent): Date | null {
  if (!event.time) return null
  const d = new Date(`${event.date}T${event.time}`)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Termine mit Uhrzeit, deren Start in [now, now + leadMs] liegt und die noch
 * nicht benachrichtigt wurden — die Kandidaten für eine "kurz vorher"-Erinnerung.
 */
export function dueReminders(
  events: CalendarEvent[],
  now: Date,
  leadMs: number,
  notified: ReadonlySet<string>,
): CalendarEvent[] {
  const from = now.getTime()
  const to = from + leadMs
  return events.filter((e) => {
    if (notified.has(e.id)) return false
    const start = eventStart(e)
    if (!start) return false
    const t = start.getTime()
    return t >= from && t <= to
  })
}

/** Kurzer Text für den Benachrichtigungs-Body. */
export function reminderText(event: CalendarEvent): string {
  return event.time ? `${event.time} Uhr – ${event.title}` : event.title
}

const NOTIFIED_KEY = 'life-hub.notified.v1'

/** IDs bereits benachrichtigter Termine (überlebt einen Reload, verhindert Doppel-Hinweise). */
export function loadNotifiedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((x): x is string => typeof x === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

export function saveNotifiedIds(ids: Set<string>): void {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids]))
}
