import { useEffect, useMemo, useState } from 'react'
import { isoDate, monthGrid, monthLabel, sameDay } from '../../lib/date'
import {
  addEvent,
  eventsOn,
  loadEvents,
  removeEvent,
  saveEvents,
  type CalendarEvent,
} from '../../lib/events'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export default function Calendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(isoDate(today))
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadEvents())

  useEffect(() => {
    saveEvents(events)
  }, [events])

  const cells = useMemo(() => monthGrid(year, month), [year, month])

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelected(isoDate(today))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="rounded-xl border border-line bg-card p-4">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl text-gold">{monthLabel(year, month)}</h2>
          <div className="flex gap-1">
            <NavButton label="Voriger Monat" onClick={() => shiftMonth(-1)}>
              ‹
            </NavButton>
            <NavButton label="Heute" onClick={goToday}>
              Heute
            </NavButton>
            <NavButton label="Nächster Monat" onClick={() => shiftMonth(1)}>
              ›
            </NavButton>
          </div>
        </header>

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
                onClick={() => setSelected(iso)}
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
