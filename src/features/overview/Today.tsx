import { useEffect, useMemo, useState } from 'react'
import { eventColorHex } from '../../lib/colors'
import { isoDate } from '../../lib/date'
import {
  eventsOn,
  loadEvents,
  nextOccurrence,
  REPEAT_LABELS,
  type CalendarEvent,
} from '../../lib/events'
import { isOverdue, loadTodos, saveTodos, toggleTodo, type Todo } from '../../lib/todos'

/** Sprungziele, damit ein Klick auf einen Eintrag zum passenden Tab führt. */
export interface TodayNav {
  toCalendar: (date: string) => void
}

const MAX_UPCOMING = 4

function greeting(hour: number): string {
  if (hour < 5) return 'Gute Nacht'
  if (hour < 11) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

/** "2026-07-20" → "Mo, 20. Juli" bzw. "Heute"/"Morgen". */
function dayLabel(iso: string, todayIso: string, tomorrowIso: string): string {
  if (iso === todayIso) return 'Heute'
  if (iso === tomorrowIso) return 'Morgen'
  return new Date(iso + 'T00:00').toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
}

export default function Today({ nav }: { nav: TodayNav }) {
  const now = new Date()
  const todayIso = isoDate(now)
  const tomorrowIso = isoDate(new Date(now.getTime() + 86_400_000))

  const [events] = useState<CalendarEvent[]>(() => loadEvents())
  const [todos, setTodos] = useState<Todo[]>(() => loadTodos())

  useEffect(() => {
    saveTodos(todos)
  }, [todos])

  const todaysEvents = useMemo(() => eventsOn(events, todayIso), [events, todayIso])

  const dueTodos = useMemo(
    () =>
      todos
        .filter((t) => !t.done && t.due !== undefined && t.due <= todayIso)
        .sort((a, b) => a.due!.localeCompare(b.due!)),
    [todos, todayIso],
  )

  const upcoming = useMemo(
    () =>
      events
        .map((e) => ({ event: e, occ: nextOccurrence(e, tomorrowIso) }))
        .filter((x): x is { event: CalendarEvent; occ: string } => x.occ !== null)
        .sort((a, b) => a.occ.localeCompare(b.occ) || (a.event.time ?? '').localeCompare(b.event.time ?? ''))
        .slice(0, MAX_UPCOMING),
    [events, tomorrowIso],
  )

  const dateLabel = now.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h2 className="font-serif text-2xl text-gold">{greeting(now.getHours())}</h2>
        <p className="text-sm text-muted">{dateLabel}</p>
      </div>

      <section className="rounded-xl border border-line bg-card p-4">
        <h3 className="mb-3 text-xs uppercase tracking-wide text-muted">Termine heute</h3>
        {todaysEvents.length === 0 ? (
          <p className="text-sm text-muted">Keine Termine heute.</p>
        ) : (
          <ul className="space-y-1.5">
            {todaysEvents.map((e) => (
              <li key={e.id}>
                <button
                  onClick={() => nav.toCalendar(todayIso)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-night"
                >
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: eventColorHex(e.color) }}
                    aria-hidden
                  />
                  {e.time && <span className="shrink-0 text-gold">{e.time}</span>}
                  <span className="min-w-0 flex-1 truncate text-ink">{e.title}</span>
                  {e.repeat && (
                    <span className="shrink-0 text-xs text-muted">🔁 {REPEAT_LABELS[e.repeat]}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-line bg-card p-4">
        <h3 className="mb-3 text-xs uppercase tracking-wide text-muted">Fällige To-dos</h3>
        {dueTodos.length === 0 ? (
          <p className="text-sm text-muted">Nichts fällig — alles erledigt. 🎉</p>
        ) : (
          <ul className="space-y-1.5">
            {dueTodos.map((t) => (
              <li key={t.id} className="flex items-center gap-2.5 text-sm">
                <button
                  role="checkbox"
                  aria-checked={t.done}
                  aria-label={
                    t.repeat ? `"${t.text}" erledigen – wiederholt sich` : `"${t.text}" als erledigt markieren`
                  }
                  onClick={() => setTodos((prev) => toggleTodo(prev, t.id))}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-line text-[10px] text-transparent transition-colors hover:border-gold"
                >
                  ✓
                </button>
                <span className="min-w-0 flex-1 break-words text-ink">{t.text}</span>
                {t.repeat && (
                  <span className="shrink-0 text-xs text-muted">🔁 {REPEAT_LABELS[t.repeat]}</span>
                )}
                {isOverdue(t, now) && (
                  <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-400">
                    überfällig
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="rounded-xl border border-line bg-card p-4">
          <h3 className="mb-3 text-xs uppercase tracking-wide text-muted">Demnächst</h3>
          <ul className="space-y-1.5">
            {upcoming.map(({ event: e, occ }) => (
              <li key={e.id}>
                <button
                  onClick={() => nav.toCalendar(occ)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-night"
                >
                  <span className="w-28 shrink-0 text-muted">
                    {dayLabel(occ, todayIso, tomorrowIso)}
                  </span>
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: eventColorHex(e.color) }}
                    aria-hidden
                  />
                  {e.time && <span className="shrink-0 text-gold">{e.time}</span>}
                  <span className="min-w-0 flex-1 truncate text-ink">{e.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
