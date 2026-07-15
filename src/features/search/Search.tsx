import { useMemo, useState } from 'react'
import { loadEvents } from '../../lib/events'
import { loadNotes } from '../../lib/notes'
import { search, snippet } from '../../lib/search'
import { loadTodos } from '../../lib/todos'

export default function Search() {
  const [query, setQuery] = useState('')
  // Daten einmal je Eingabe laden — die App ist single-user, das reicht.
  const results = useMemo(
    () => search(query, { events: loadEvents(), todos: loadTodos(), notes: loadNotes() }),
    [query],
  )
  const q = query.trim()

  return (
    <div className="mx-auto max-w-2xl">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Termine, To-dos und Notizen durchsuchen …"
        autoFocus
        className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm placeholder:text-muted focus:border-gold focus:outline-none"
      />

      {q === '' ? (
        <p className="mt-6 text-center font-serif text-muted">
          Gib einen Suchbegriff ein, um alles auf einmal zu durchsuchen.
        </p>
      ) : results.total === 0 ? (
        <p className="mt-6 text-center font-serif text-muted">
          Keine Treffer für „{q}".
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <Section title="Termine" count={results.events.length}>
            {results.events.map((e) => (
              <li key={e.id} className="rounded-md border border-line bg-card px-3 py-2 text-sm">
                <span className="text-gold">{formatEventDate(e.date)}</span>
                {e.time && <span className="text-gold"> · {e.time} Uhr</span>} · {e.title}
              </li>
            ))}
          </Section>

          <Section title="To-dos" count={results.todos.length}>
            {results.todos.map((t) => (
              <li key={t.id} className="rounded-md border border-line bg-card px-3 py-2 text-sm">
                <span className={t.done ? 'text-muted line-through' : 'text-ink'}>{t.text}</span>
                {t.done && <span className="ml-2 text-xs text-muted">erledigt</span>}
              </li>
            ))}
          </Section>

          <Section title="Notizen" count={results.notes.length}>
            {results.notes.map((n) => (
              <li key={n.id} className="rounded-md border border-line bg-card px-3 py-2 text-sm">
                <span className="font-semibold text-ink">{n.title || 'Ohne Titel'}</span>
                {n.content && (
                  <span className="block truncate text-xs text-muted">{snippet(n.content, q)}</span>
                )}
              </li>
            ))}
          </Section>
        </div>
      )}
    </div>
  )
}

function Section(props: { title: string; count: number; children: React.ReactNode }) {
  if (props.count === 0) return null
  return (
    <section>
      <h3 className="mb-2 font-serif text-sm uppercase tracking-wide text-muted">
        {props.title} <span className="text-gold">{props.count}</span>
      </h3>
      <ul className="space-y-1">{props.children}</ul>
    </section>
  )
}

function formatEventDate(iso: string): string {
  return new Date(iso + 'T00:00').toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
