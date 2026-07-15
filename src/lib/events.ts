import { isoDate } from './date'

/** Wiederholungs-Rhythmus eines Termins (undefined = einmalig). */
export type Repeat = 'daily' | 'weekly' | 'monthly'

export const REPEATS: Repeat[] = ['daily', 'weekly', 'monthly']

export interface CalendarEvent {
  id: string
  /** ISO-Datum YYYY-MM-DD (Startdatum bei Wiederholung) */
  date: string
  title: string
  /** Uhrzeit HH:MM, optional */
  time?: string
  /** Wiederholung, optional */
  repeat?: Repeat
  /** Ausgenommene Tage (ISO-Daten), an denen eine Wiederholung nicht stattfindet */
  except?: string[]
  /** Farb-Markierung (Schlüssel aus EVENT_COLORS), optional */
  color?: string
}

const STORAGE_KEY = 'life-hub.events.v1'

/** Wird nach jedem Speichern auf window ausgelöst, damit die Kopfleiste aktualisiert. */
export const EVENTS_CHANGED = 'life-hub:events-changed'

export function loadEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is CalendarEvent =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as CalendarEvent).id === 'string' &&
        typeof (e as CalendarEvent).date === 'string' &&
        typeof (e as CalendarEvent).title === 'string',
    )
  } catch {
    return []
  }
}

export function saveEvents(events: CalendarEvent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTS_CHANGED))
  }
}

export function addEvent(
  events: CalendarEvent[],
  data: Omit<CalendarEvent, 'id'>,
): CalendarEvent[] {
  const event: CalendarEvent = { id: crypto.randomUUID(), ...data }
  return sortEvents([...events, event])
}

export function removeEvent(events: CalendarEvent[], id: string): CalendarEvent[] {
  return events.filter((e) => e.id !== id)
}

/** Nimmt einen einzelnen Tag aus einer wiederkehrenden Serie aus. */
export function addException(events: CalendarEvent[], id: string, iso: string): CalendarEvent[] {
  return events.map((e) =>
    e.id === id ? { ...e, except: [...new Set([...(e.except ?? []), iso])] } : e,
  )
}

/** Ersetzt Titel/Uhrzeit/Wiederholung eines Termins (Datum und ID bleiben). */
export function updateEvent(
  events: CalendarEvent[],
  id: string,
  patch: Partial<Omit<CalendarEvent, 'id' | 'date'>>,
): CalendarEvent[] {
  return sortEvents(events.map((e) => (e.id === id ? { ...e, ...patch } : e)))
}

/** Anzahl Tage zwischen zwei ISO-Daten (toIso - fromIso). */
function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + 'T00:00')
  const b = new Date(toIso + 'T00:00')
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/** Ob ein (ggf. wiederkehrender) Termin an einem bestimmten Tag stattfindet. */
export function occursOn(event: CalendarEvent, iso: string): boolean {
  if (iso < event.date) return false
  if (event.except?.includes(iso)) return false
  if (iso === event.date) return true
  switch (event.repeat) {
    case 'daily':
      return true
    case 'weekly':
      return daysBetween(event.date, iso) % 7 === 0
    case 'monthly':
      return new Date(event.date + 'T00:00').getDate() === new Date(iso + 'T00:00').getDate()
    default:
      return false
  }
}

/** Das nächste Datum ab (einschließlich) `fromIso`, an dem der Termin stattfindet, oder null. */
export function nextOccurrence(event: CalendarEvent, fromIso: string): string | null {
  if (!event.repeat) return event.date >= fromIso ? event.date : null
  const start = event.date >= fromIso ? event.date : fromIso
  const d = new Date(start + 'T00:00')
  for (let i = 0; i < 800; i++) {
    const iso = isoDate(d)
    if (occursOn(event, iso)) return iso
    d.setDate(d.getDate() + 1)
  }
  return null
}

export function eventsOn(events: CalendarEvent[], date: string): CalendarEvent[] {
  return events.filter((e) => occursOn(e, date))
}

/**
 * Der nächste anstehende Termin ab (einschließlich) dem gegebenen ISO-Datum,
 * oder null. Bei Wiederholungen zählt die nächste Wiederholung; das Ergebnis
 * trägt das Datum dieser Wiederholung.
 */
export function nextEvent(events: CalendarEvent[], fromDate: string): CalendarEvent | null {
  const upcoming = events
    .map((e) => {
      const occ = nextOccurrence(e, fromDate)
      return occ ? { ...e, date: occ } : null
    })
    .filter((e): e is CalendarEvent => e !== null)
  return sortEvents(upcoming)[0] ?? null
}

function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''),
  )
}
