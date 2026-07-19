import { useMemo, useState } from 'react'
import { loadEvents } from '../../lib/events'
import { loadNotes } from '../../lib/notes'
import { search, snippet } from '../../lib/search'
import { loadTodos } from '../../lib/todos'

/** Sprungziel eines Suchtreffers — von der App in den passenden Tab übersetzt. */
export type SearchNav =
  | { tab: 'Kalender'; date: string }
  | { tab: 'To-dos'; todoId: string }
  | { tab: 'Notizen'; noteId: string }

export default function Search({ onNavigate }: { onNavigate: (nav: SearchNav) => void }) {
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
        placeholder="Durchsuchen … (mit #tag gezielt nach Notiz-Tags)"
        autoFocus
        className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm placeholder:text-muted focus:border-gold focus:outline-none"
      />

      {q === '' ? (
        <p className="mt-6 text-center font-serif text-muted">
          Gib einen Suchbegriff ein, um alles auf einmal zu durchsuchen.
        </p>
      ) : results.total === 0 ? (
        <p className="mt-6 text-center font-serif text-muted">Keine Treffer für „{q}".</p>
      ) : (
        <div className="mt-4 space-y-4">
          <Section title="Termine" count={results.events.length}>
            {results.events.map((e) => (
              <ResultButton key={e.id} onClick={() => onNavigate({ tab: 'Kalender', date: e.date })}>
                <span className="text-gold">{formatEventDate(e.date)}</span>
                {e.time && <span className="text-gold"> · {e.time} Uhr</span>} · {e.title}
              </ResultButton>
            ))}
          </Section>

          <Section title="To-dos" count={results.todos.length}>
            {results.todos.map((t) => (
              <ResultButton key={t.id} onClick={() => onNavigate({ tab: 'To-dos', todoId: t.id })}>
                <span className={t.done ? 'text-muted line-through' : 'text-ink'}>{t.text}</span>
                {t.done && <span className="ml-2 text-xs text-muted">erledigt</span>}
              </ResultButton>
            ))}
          </Section>

          <Section title="Notizen" count={results.notes.length}>
            {results.notes.map((n) => (
              <ResultButton key={n.id} onClick={() => onNavigate({ tab: 'Notizen', noteId: n.id })}>
                <span className="font-semibold text-ink">{n.title || 'Ohne Titel'}</span>
                {n.content && (
                  <span className="block truncate text-xs text-muted">{snippet(n.content, q)}</span>
                )}
              </ResultButton>
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

function ResultButton(props: { onClick: () => void; children: React.ReactNode }) {
  return (
    <li>
      <button
        onClick={props.onClick}
        className="w-full rounded-md border border-line bg-card px-3 py-2 text-left text-sm transition-colors hover:border-gold"
      >
        {props.children}
      </button>
    </li>
  )
}

function formatEventDate(iso: string): string {
  return new Date(iso + 'T00:00').toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
