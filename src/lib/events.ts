export interface CalendarEvent {
  id: string
  /** ISO-Datum YYYY-MM-DD */
  date: string
  title: string
  /** Uhrzeit HH:MM, optional */
  time?: string
}

const STORAGE_KEY = 'life-hub.events.v1'

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

export function eventsOn(events: CalendarEvent[], date: string): CalendarEvent[] {
  return events.filter((e) => e.date === date)
}

function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''),
  )
}
