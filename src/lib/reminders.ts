import { isoDate } from './date'
import { occursOn, type CalendarEvent } from './events'
import type { Todo } from './todos'

/** Kombiniert Datum + Uhrzeit eines Termins zu einem lokalen Date; null ohne (gültige) Uhrzeit. */
export function eventStart(event: CalendarEvent): Date | null {
  if (!event.time) return null
  const d = new Date(`${event.date}T${event.time}`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Dedup-Schlüssel je Termin und Tag (damit Wiederholungen an jedem Tag einmal erinnern). */
export function reminderKey(event: CalendarEvent, now: Date): string {
  return `${event.id}@${isoDate(now)}`
}

/**
 * Termine mit Uhrzeit, die heute (auch als Wiederholung) stattfinden und deren
 * Startzeit in [now, now + leadMs] liegt und die für heute noch nicht
 * benachrichtigt wurden — Kandidaten für eine "kurz vorher"-Erinnerung.
 */
export function dueReminders(
  events: CalendarEvent[],
  now: Date,
  leadMs: number,
  notified: ReadonlySet<string>,
): CalendarEvent[] {
  const todayIso = isoDate(now)
  const from = now.getTime()
  const to = from + leadMs
  return events.filter((e) => {
    if (!e.time || !occursOn(e, todayIso)) return false
    if (notified.has(reminderKey(e, now))) return false
    const start = new Date(`${todayIso}T${e.time}`)
    const t = start.getTime()
    return t >= from && t <= to
  })
}

/** Kurzer Text für den Benachrichtigungs-Body. */
export function reminderText(event: CalendarEvent): string {
  return event.time ? `${event.time} Uhr – ${event.title}` : event.title
}

/** Dedup-Schlüssel je Aufgabe und Tag (überfällige erinnern an jedem neuen Tag erneut). */
export function todoReminderKey(todo: Todo, now: Date): string {
  return `todo:${todo.id}@${isoDate(now)}`
}

/**
 * Offene To-dos, die heute (oder früher) fällig sind und für heute noch nicht
 * benachrichtigt wurden — Kandidaten für eine Fälligkeits-Erinnerung.
 */
export function dueTodoReminders(
  todos: Todo[],
  now: Date,
  notified: ReadonlySet<string>,
): Todo[] {
  const todayIso = isoDate(now)
  return todos.filter(
    (t) =>
      !t.done &&
      t.due !== undefined &&
      t.due <= todayIso &&
      !notified.has(todoReminderKey(t, now)),
  )
}

/** Kurzer Text für die To-do-Benachrichtigung (unterscheidet fällig heute / überfällig). */
export function todoReminderText(todo: Todo, now: Date): string {
  const overdue = todo.due !== undefined && todo.due < isoDate(now)
  return `${overdue ? 'Überfällig' : 'Fällig heute'}: ${todo.text}`
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
