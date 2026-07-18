import { useEffect, useMemo, useRef, useState } from 'react'
import {
  categoryName,
  loadCategoryNames,
  saveCategoryNames,
  type CategoryNames,
} from '../../lib/categories'
import { EVENT_COLORS, eventColorHex } from '../../lib/colors'
import { isoDate, monthGrid, monthLabel, sameDay, weekGrid, weekLabel } from '../../lib/date'
import { buildICS, parseICS } from '../../lib/ical'
import {
  addEvent,
  addException,
  eventsOn,
  loadEvents,
  removeEvent,
  REPEAT_LABELS,
  saveEvents,
  updateEvent,
  type CalendarEvent,
  type Repeat,
} from '../../lib/events'
import { loadTodos, saveTodos, toggleTodo, type Todo } from '../../lib/todos'

/** Farb-Schlüssel eines Termins (Gold ist Standard). */
function eventColorKey(e: CalendarEvent): string {
  return e.color ?? 'gold'
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

type View = 'month' | 'week'

export default function Calendar({ initialDate }: { initialDate?: string } = {}) {
  const today = new Date()
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState<Date>(initialDate ? new Date(initialDate + 'T00:00') : today)
  const [selected, setSelected] = useState(initialDate ?? isoDate(today))
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadEvents())
  const [catNames, setCatNames] = useState<CategoryNames>(() => loadCategoryNames())
  const [filter, setFilter] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [todos, setTodos] = useState<Todo[]>(() => loadTodos())
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    saveEvents(events)
  }, [events])

  useEffect(() => {
    saveTodos(todos)
  }, [todos])

  function renameCategory(key: string, name: string) {
    setCatNames((prev) => {
      const next = { ...prev, [key]: name }
      saveCategoryNames(next)
      return next
    })
  }

  const visibleEvents = filter ? events.filter((e) => eventColorKey(e) === filter) : events

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

  /** Lädt alle Termine als iCalendar-Datei herunter (Import in Google/Apple/Outlook). */
  function exportICS() {
    const blob = new Blob([buildICS(events)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'life-hub-kalender.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  /** Liest eine .ics-Datei ein und übernimmt neue Termine (Duplikate werden übersprungen). */
  async function importICS(file: File) {
    try {
      const parsed = parseICS(await file.text())
      if (!parsed.length) {
        setImportStatus('Keine Termine in der Datei gefunden.')
        return
      }
      const key = (e: CalendarEvent) => `${e.date}|${e.time ?? ''}|${e.title}`
      const seen = new Set(events.map(key))
      const fresh = parsed.filter((e) => !seen.has(key(e)))
      const skipped = parsed.length - fresh.length
      if (fresh.length) setEvents((prev) => [...prev, ...fresh])
      setImportStatus(
        `${fresh.length} Termin${fresh.length === 1 ? '' : 'e'} importiert` +
          (skipped ? `, ${skipped} bereits vorhanden` : '') +
          '.',
      )
    } catch {
      setImportStatus('Datei konnte nicht gelesen werden.')
    }
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
              <NavButton label="Als .ics exportieren" onClick={exportICS}>
                ⤓
              </NavButton>
              <NavButton label=".ics importieren" onClick={() => fileInput.current?.click()}>
                ⤒
              </NavButton>
              <input
                ref={fileInput}
                type="file"
                accept=".ics,text/calendar"
                className="hidden"
                onChange={(ev) => {
                  const file = ev.target.files?.[0]
                  if (file) void importICS(file)
                  ev.target.value = ''
                }}
              />
            </div>
          </div>
        </header>
        {importStatus && (
          <p className="mb-3 rounded-md border border-line bg-night/40 px-3 py-2 text-sm text-muted" role="status">
            {importStatus}
          </p>
        )}

        <CategoryFilter
          names={catNames}
          filter={filter}
          onFilter={setFilter}
          onRename={renameCategory}
        />

        {view === 'month' ? (
          <MonthView
            cursor={cursor}
            today={today}
            selected={selected}
            events={visibleEvents}
            onSelect={setSelected}
          />
        ) : (
          <WeekView
            cursor={cursor}
            today={today}
            selected={selected}
            events={visibleEvents}
            onSelect={setSelected}
          />
        )}
      </section>

      <DayPanel
        date={selected}
        events={eventsOn(visibleEvents, selected)}
        todos={todos.filter((t) => t.due === selected)}
        onToggleTodo={(id) => setTodos((prev) => toggleTodo(prev, id))}
        catNames={catNames}
        onAdd={(title, time, repeat, color, endDate) =>
          setEvents((prev) =>
            addEvent(prev, {
              date: selected,
              title,
              time: time || undefined,
              repeat,
              color,
              endDate,
            }),
          )
        }
        onUpdate={(id, patch) => setEvents((prev) => updateEvent(prev, id, patch))}
        onRemove={(id) => setEvents((prev) => removeEvent(prev, id))}
        onRemoveOccurrence={(id) => setEvents((prev) => addException(prev, id, selected))}
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
                    ? 'flex h-5 w-5 items-center justify-center rounded-full bg-gold font-semibold text-accentink'
                    : 'text-muted')
                }
              >
                {day.getDate()}
              </span>
              {dayEvents.slice(0, 2).map((e) => (
                <span key={e.id} className="w-full truncate text-[10px] leading-tight text-ink">
                  <span style={{ color: eventColorHex(e.color) }}>•</span> {e.title}
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
                  (isToday ? 'bg-gold font-semibold text-accentink' : 'text-ink')
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
                    <span className="mr-1.5" style={{ color: eventColorHex(e.color) }}>
                      ●
                    </span>
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
        (props.active ? 'bg-gold font-semibold text-accentink' : 'text-muted hover:text-ink')
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

function CategoryFilter(props: {
  names: CategoryNames
  filter: string | null
  onFilter: (key: string | null) => void
  onRename: (key: string, name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterChip active={props.filter === null} onClick={() => props.onFilter(null)}>
          Alle
        </FilterChip>
        {EVENT_COLORS.map((c) => (
          <FilterChip
            key={c.key}
            active={props.filter === c.key}
            onClick={() => props.onFilter(props.filter === c.key ? null : c.key)}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: c.hex }}
              aria-hidden
            />
            {categoryName(props.names, c.key)}
          </FilterChip>
        ))}
        <button
          onClick={() => setEditing((v) => !v)}
          aria-label="Kategorien benennen"
          title="Kategorien benennen"
          className="ml-auto rounded-md border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-gold hover:text-gold"
        >
          ✎
        </button>
      </div>
      {editing && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {EVENT_COLORS.map((c) => (
            <label key={c.key} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: c.hex }}
                aria-hidden
              />
              <input
                value={categoryName(props.names, c.key)}
                onChange={(e) => props.onRename(c.key, e.target.value)}
                aria-label={`Name für ${c.label}`}
                className="w-full rounded border border-line bg-night px-2 py-1 text-xs focus:border-gold focus:outline-none"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterChip(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      className={
        'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ' +
        (props.active ? 'border-gold text-gold' : 'border-line text-muted hover:text-ink')
      }
    >
      {props.children}
    </button>
  )
}

function DayPanel(props: {
  date: string
  events: CalendarEvent[]
  todos: Todo[]
  onToggleTodo: (id: string) => void
  catNames: CategoryNames
  onAdd: (
    title: string,
    time: string,
    repeat: Repeat | undefined,
    color: string | undefined,
    endDate: string | undefined,
  ) => void
  onUpdate: (
    id: string,
    patch: { title: string; time?: string; repeat?: Repeat; color?: string; endDate?: string },
  ) => void
  onRemove: (id: string) => void
  onRemoveOccurrence: (id: string) => void
}) {
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [repeat, setRepeat] = useState<'' | Repeat>('')
  const [color, setColor] = useState('gold')
  const [endDate, setEndDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Formular zurücksetzen, wenn ein anderer Tag gewählt wird.
  useEffect(() => {
    setEditingId(null)
    setTitle('')
    setTime('')
    setRepeat('')
    setColor('gold')
    setEndDate('')
  }, [props.date])

  const label = new Date(props.date + 'T00:00').toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setTime('')
    setRepeat('')
    setColor('gold')
    setEndDate('')
  }

  function startEdit(e: CalendarEvent) {
    setEditingId(e.id)
    setTitle(e.title)
    setTime(e.time ?? '')
    setRepeat(e.repeat ?? '')
    setColor(e.color ?? 'gold')
    setEndDate(e.endDate ?? '')
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    const colorValue = color === 'gold' ? undefined : color
    // Enddatum nur für einmalige Termine und nur, wenn es nach dem Starttag liegt.
    const endValue = !repeat && endDate && endDate > props.date ? endDate : undefined
    if (editingId) {
      props.onUpdate(editingId, {
        title: trimmed,
        time: time || undefined,
        repeat: repeat || undefined,
        color: colorValue,
        endDate: endValue,
      })
    } else {
      props.onAdd(trimmed, time, repeat || undefined, colorValue, endValue)
    }
    resetForm()
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
              className={
                'flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ' +
                (e.id === editingId ? 'border-gold' : 'border-line')
              }
            >
              <span className="min-w-0">
                <span
                  className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ backgroundColor: eventColorHex(e.color) }}
                  aria-hidden
                />
                {e.time && <span className="mr-2 text-gold">{e.time}</span>}
                {e.title}
                {e.repeat && (
                  <span className="ml-2 whitespace-nowrap text-xs text-muted">
                    🔁 {REPEAT_LABELS[e.repeat]}
                  </span>
                )}
                {e.endDate && e.endDate > e.date && (
                  <span className="ml-2 whitespace-nowrap text-xs text-muted">
                    → bis {formatShort(e.endDate)}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 gap-2">
                <button
                  aria-label={`${e.title} bearbeiten`}
                  onClick={() => startEdit(e)}
                  className="text-muted transition-colors hover:text-gold"
                >
                  ✎
                </button>
                {e.repeat && (
                  <button
                    aria-label={`${e.title} nur an diesem Tag entfernen`}
                    title="Nur diesen Tag entfernen"
                    onClick={() => props.onRemoveOccurrence(e.id)}
                    className="text-muted transition-colors hover:text-gold"
                  >
                    ⊘
                  </button>
                )}
                <button
                  aria-label={e.repeat ? `${e.title} – ganze Serie löschen` : `${e.title} löschen`}
                  title={e.repeat ? 'Ganze Serie löschen' : 'Löschen'}
                  onClick={() => props.onRemove(e.id)}
                  className="text-muted transition-colors hover:text-gold"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {props.todos.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-xs uppercase tracking-wide text-muted">Fällige To-dos</p>
          <ul className="space-y-1.5">
            {props.todos.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2.5 rounded-md border border-line px-3 py-2 text-sm"
              >
                <button
                  role="checkbox"
                  aria-checked={t.done}
                  aria-label={
                    t.repeat
                      ? `"${t.text}" erledigen – wiederholt sich`
                      : t.done
                        ? `"${t.text}" als offen markieren`
                        : `"${t.text}" als erledigt markieren`
                  }
                  onClick={() => props.onToggleTodo(t.id)}
                  className={
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] transition-colors ' +
                    (t.done
                      ? 'border-gold bg-gold text-accentink'
                      : 'border-line text-transparent hover:border-gold')
                  }
                >
                  ✓
                </button>
                <span className={'min-w-0 flex-1 break-words ' + (t.done ? 'text-muted line-through' : 'text-ink')}>
                  {t.text}
                </span>
                {t.repeat && (
                  <span className="shrink-0 whitespace-nowrap text-xs text-muted">
                    🔁 {REPEAT_LABELS[t.repeat]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={submit} className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={editingId ? 'Titel bearbeiten…' : 'Neuer Termin…'}
          className="w-full rounded-md border border-line bg-night px-3 py-2 text-sm placeholder:text-muted focus:border-gold focus:outline-none"
        />
        <div className="flex items-center gap-2 px-1">
          {EVENT_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-label={`Farbe ${categoryName(props.catNames, c.key)}`}
              title={categoryName(props.catNames, c.key)}
              onClick={() => setColor(c.key)}
              className={
                'h-5 w-5 rounded-full transition-transform ' +
                (color === c.key ? 'ring-2 ring-offset-2 ring-offset-card ring-ink' : 'hover:scale-110')
              }
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-md border border-line bg-night px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
          />
          <select
            value={repeat}
            onChange={(e) => setRepeat(e.target.value as '' | Repeat)}
            aria-label="Wiederholung"
            className="rounded-md border border-line bg-night px-2 py-2 text-sm text-ink focus:border-gold focus:outline-none"
          >
            <option value="">Einmalig</option>
            <option value="daily">Täglich</option>
            <option value="weekly">Wöchentlich</option>
            <option value="monthly">Monatlich</option>
          </select>
          {!repeat && (
            <input
              type="date"
              value={endDate}
              min={props.date}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="Enddatum (mehrtägig)"
              title="Enddatum – für mehrtägige Termine"
              className="rounded-md border border-line bg-night px-2 py-2 text-sm text-ink focus:border-gold focus:outline-none"
            />
          )}
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-gold hover:text-gold"
            >
              Abbrechen
            </button>
          )}
          <button
            type="submit"
            className="flex-1 rounded-md bg-gold px-3 py-2 text-sm font-semibold text-accentink transition-opacity hover:opacity-90"
          >
            {editingId ? 'Speichern' : 'Hinzufügen'}
          </button>
        </div>
      </form>
    </section>
  )
}

/** Kurzes Datum wie "18.7." für die Mehrtages-Anzeige. */
function formatShort(iso: string): string {
  return new Date(iso + 'T00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })
}
