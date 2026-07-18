import { useMemo } from 'react'
import { categoryName, loadCategoryNames } from '../../lib/categories'
import { EVENT_COLORS } from '../../lib/colors'
import { loadEvents } from '../../lib/events'
import { loadNotes } from '../../lib/notes'
import { computeStats } from '../../lib/stats'
import { loadTodos } from '../../lib/todos'

export default function Stats() {
  const stats = useMemo(() => computeStats(loadEvents(), loadTodos(), loadNotes()), [])
  const catNames = useMemo(() => loadCategoryNames(), [])
  const hexOf = (key: string) => EVENT_COLORS.find((c) => c.key === key)?.hex ?? '#c8a951'
  const maxCat = Math.max(1, ...stats.events.byCategory.map((c) => c.count))

  const todoTotal = stats.todos.open + stats.todos.done
  const donePct = todoTotal === 0 ? 0 : Math.round((stats.todos.done / todoTotal) * 100)

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="font-serif text-2xl text-gold">Statistik</h2>

      <section className="rounded-xl border border-line bg-card p-4">
        <h3 className="mb-3 text-xs uppercase tracking-wide text-muted">To-dos</h3>
        <div className="grid grid-cols-3 gap-3">
          <Stat value={stats.todos.open} label="offen" />
          <Stat value={stats.todos.done} label="erledigt" />
          <Stat value={stats.todos.recurring} label="wiederkehrend" />
        </div>
        {todoTotal > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Erledigt</span>
              <span>{donePct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-night">
              <div className="h-full rounded-full bg-gold" style={{ width: `${donePct}%` }} />
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-line bg-card p-4">
        <h3 className="mb-3 text-xs uppercase tracking-wide text-muted">Termine</h3>
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Stat value={stats.events.total} label="gesamt" />
          <Stat value={stats.events.upcoming} label="nächste 30 Tage" />
          <Stat value={stats.events.recurring} label="wiederkehrend" />
        </div>
        {stats.events.total > 0 && (
          <div className="space-y-1.5">
            <p className="mb-1 text-xs text-muted">Nach Kategorie</p>
            {stats.events.byCategory.map((c) => (
              <div key={c.key} className="flex items-center gap-2 text-sm">
                <span className="w-24 shrink-0 truncate text-muted">
                  {categoryName(catNames, c.key)}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-night">
                  <div
                    className="h-full rounded"
                    style={{ width: `${(c.count / maxCat) * 100}%`, backgroundColor: hexOf(c.key) }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-muted">{c.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-line bg-card p-4">
        <h3 className="mb-3 text-xs uppercase tracking-wide text-muted">Notizen</h3>
        <div className="grid grid-cols-3 gap-3">
          <Stat value={stats.notes.count} label="Notizen" />
          <Stat value={stats.notes.words} label="Wörter" />
          <Stat value={stats.notes.withLinks} label="mit Wikilinks" />
        </div>
      </section>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-line bg-night px-3 py-3 text-center">
      <p className="font-serif text-2xl text-gold">{value.toLocaleString('de-DE')}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  )
}
