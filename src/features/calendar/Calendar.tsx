import { useEffect, useMemo, useState } from 'react'
import { isoDate, monthGrid, monthLabel, sameDay, weekGrid, weekLabel } from '../../lib/date'
import {
  addEvent,
  eventsOn,
  loadEvents,
  removeEvent,
  saveEvents,
  type CalendarEvent,
} from '../../lib/events'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

type View = 'month' | 'week'

export default function Calendar() {
  const today = new Date()
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState<Date>(today)
  const [selected, setSelected] = useState(isoDate(today))
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadEvents())

  useEffect(() => {
    saveEvents(events)
  }, [events])

  function shift(delta: number) {
    setCursor((c) =>
      view === 'month'
        ? new Date(c.getFullYear(), c.getMonth() + delta, 1)
        : new Date(c.getFullYear(), c.getMonth(), c.getDate() + delta * 7),
    )
  }

  function goToday() {
    setCursor(new Date())
    setSelected(isoDate(today))
  }

  const label = view === 'month' ? monthLabel(cursor.getFullYear(), cursor.getMonth()) : weekLabel(cursor)

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="rounded-xl border border-line bg-card p-4">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-lg text-gold sm:text-xl">{label}</h2>
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-md border border-line">
              <ViewTab active={view === 'month'} onClick={() => setView('month')}>
                Monat
              </ViewTab>
              <ViewTab active={view === 'week'} onClick={() => setView('week')}>
                Woche
              </ViewTab>
            </div>
            <div className="flex gap-1">
              <NavButton label="Zurück" onClick={() => shift(-1)}>
                ‹
              </NavButton>
              <NavButton label="Heute" onClick={goToday}>
                Heute
              </NavButton>
              <NavButton label="Weiter" onClick={() => shift(1)}>
                ›
              </NavButton>
            </div>
          </div>
        </header>

        {view === 'month' ? (
          <MonthView
            cursor={cursor}
            today={today}
            selected={selected}
            events={events}
            onSelect={setSelected}
          />
        ) : (
          <WeekView
            cursor={cursor}
            today={today}
            selected={selected}
            events={events}
            onSelect={setSelected}
          />
        )}
      </section>

      <DayPanel
        date={selected}
        events={eventsOn(events, selected)}
        onAdd={(title, time) =>
          setEvents((prev) => addEvent(prev, { date: selected, title, time: time || undefined }))
        }
        onRemove={(id) => setEvents((prev) => removeEvent(prev, id))}
      />
    </div>
  )
}

interface ViewProps {
  cursor: Date
  today: Date
  selected: string
  events: CalendarEvent[]
  onSelect: (iso: string) => void
}

function MonthView({ cursor, today, selected, events, onSelect }: ViewProps) {
  const month = cursor.getMonth()
  const cells = useMemo(() => monthGrid(cursor.getFullYear(), month), [cursor, month])

  return (
    <>
      <div className="grid grid-cols-7 text-center text-xs text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-line">
        {cells.map((day) => {
          const iso = isoDate(day)
          const inMonth = day.getMonth() === month
          const isToday = sameDay(day, today)
          const isSelected = iso === selected
          const dayEvents = eventsOn(events, iso)
          return (
            <button
              key={iso}
              onClick={() => onSelect(iso)}
              className={
                'flex min-h-16 flex-col items-start gap-1 bg-night p-1.5 text-left transition-colors hover:bg-card ' +
                (inMonth ? '' : 'opacity-40 ') +
                (isSelected ? 'bg-card outline outline-1 -outline-offset-1 outline-gold' : '')
              }
            >
              <span
                className={
                  'text-xs ' +
                  (isToday
                    ? 'flex h-5 w-5 items-center justify-center rounded-full bg-gold font-semibold text-night'
                    : 'text-muted')
                }
              >
                {day.getDate()}
              </span>
              {dayEvents.slice(0, 2).map((e) => (
                <span key={e.id} className="w-full truncate text-[10px] leading-tight text-ink">
                  <span className="text-gold">•</span> {e.title}
                </span>
              ))}
              {dayEvents.length > 2 && (
                <span className="text-[10px] text-muted">+{dayEvents.length - 2} weitere</span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}

function WeekView({ cursor, today, selected, events, onSelect }: ViewProps) {
  const days = useMemo(() => weekGrid(cursor), [cursor])

  return (
    <div className="space-y-px overflow-hidden rounded-lg bg-line">
      {days.map((day) => {
        const iso = isoDate(day)
        const isToday = sameDay(day, today)
        const isSelected = iso === selected
        const dayEvents = eventsOn(events, iso)
        const weekday = day.toLocaleDateString('de-DE', { weekday: 'short' })
        return (
          <button
            key={iso}
            onClick={() => onSelect(iso)}
            className={
              'flex min-h-14 w-full items-start gap-3 bg-night px-3 py-2 text-left transition-colors hover:bg-card ' +
              (isSelected ? 'outline outline-1 -outline-offset-1 outline-gold' : '')
            }
          >
            <span className="flex w-12 shrink-0 flex-col items-center">
              <span className="text-[11px] uppercase text-muted">{weekday}</span>
              <span
                className={
                  'flex h-6 w-6 items-center justify-center rounded-full text-sm ' +
                  (isToday ? 'bg-gold font-semibold text-night' : 'text-ink')
                }
              >
                {day.getDate()}
              </span>
            </span>
            <span className="min-w-0 flex-1 space-y-0.5 py-0.5">
              {dayEvents.length === 0 ? (
                <span className="text-xs text-muted">—</span>
              ) : (
                dayEvents.map((e) => (
                  <span key={e.id} className="block truncate text-sm text-ink">
                    {e.time && <span className="mr-1.5 text-gold">{e.time}</span>}
                    {e.title}
                  </span>
                ))
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ViewTab(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      className={
        'px-2.5 py-1 text-sm transition-colors ' +
        (props.active ? 'bg-gold font-semibold text-night' : 'text-muted hover:text-ink')
      }
    >
      {props.children}
    </button>
  )
}

function NavButton(props: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={props.label}
      onClick={props.onClick}
      className="rounded-md border border-line px-2.5 py-1 text-sm text-ink transition-colors hover:border-gold hover:text-gold"
    >
      {props.children}
    </button>
  )
}

function DayPanel(props: {
  date: string
  events: CalendarEvent[]
  onAdd: (title: string, time: string) => void
  onRemove: (id: string) => void
}) {
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')

  const label = new Date(props.date + 'T00:00').toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    props.onAdd(trimmed, time)
    setTitle('')
    setTime('')
  }

  return (
    <section className="rounded-xl border border-line bg-card p-4">
      <h3 className="mb-3 font-serif text-lg text-gold">{label}</h3>

      {props.events.length === 0 ? (
        <p className="mb-4 text-sm text-muted">Keine Termine.</p>
      ) : (
        <ul className="mb-4 space-y-2">
          {props.events.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-sm"
            >
              <span>
                {e.time && <span className="mr-2 text-gold">{e.time}</span>}
                {e.title}
              </span>
              <button
                aria-label={`${e.title} löschen`}
                onClick={() => props.onRemove(e.id)}
                className="text-muted transition-colors hover:text-gold"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Neuer Termin…"
          className="w-full rounded-md border border-line bg-night px-3 py-2 text-sm placeholder:text-muted focus:border-gold focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-md border border-line bg-night px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            className="flex-1 rounded-md bg-gold px-3 py-2 text-sm font-semibold text-night transition-opacity hover:opacity-90"
          >
            Hinzufügen
          </button>
        </div>
      </form>
    </section>
  )
}
