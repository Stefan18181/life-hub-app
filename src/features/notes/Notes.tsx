import { useEffect, useState } from 'react'
import { renderMarkdown } from '../../lib/markdown'
import {
  addNote,
  findByTitle,
  loadNotes,
  removeNote,
  saveNotes,
  updateNote,
  type Note,
} from '../../lib/notes'

export default function Notes({ initialNoteId }: { initialNoteId?: string } = {}) {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes())
  const [selectedId, setSelectedId] = useState<string | null>(initialNoteId ?? notes[0]?.id ?? null)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    saveNotes(notes)
  }, [notes])

  const selected = notes.find((n) => n.id === selectedId) ?? null

  function createNote(title = 'Neue Notiz') {
    setNotes((prev) => {
      const next = addNote(prev, title)
      const created = next.find((n) => !prev.some((p) => p.id === n.id))
      if (created) setSelectedId(created.id)
      return next
    })
    setPreview(false)
  }

  function openWikiLink(target: string) {
    const existing = findByTitle(notes, target)
    if (existing) {
      setSelectedId(existing.id)
    } else {
      createNote(target)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <section className="rounded-xl border border-line bg-card p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-lg text-gold">Notizen</h2>
          <button
            onClick={() => createNote()}
            className="rounded-md bg-gold px-3 py-1 text-sm font-semibold text-accentink transition-opacity hover:opacity-90"
          >
            + Neu
          </button>
        </header>

        {notes.length === 0 ? (
          <p className="text-sm text-muted">Noch keine Notizen.</p>
        ) : (
          <ul className="space-y-1">
            {notes.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => setSelectedId(n.id)}
                  className={
                    'w-full rounded-md px-3 py-2 text-left text-sm transition-colors ' +
                    (n.id === selectedId
                      ? 'bg-night text-gold'
                      : 'text-ink hover:bg-night')
                  }
                >
                  <span className="block truncate">{n.title || 'Ohne Titel'}</span>
                  <span className="text-xs text-muted">
                    {new Date(n.updatedAt).toLocaleDateString('de-DE', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-line bg-card p-4">
        {!selected ? (
          <div className="flex h-64 items-center justify-center">
            <p className="font-serif text-lg text-muted">
              Wähle eine Notiz aus oder lege eine neue an.
            </p>
          </div>
        ) : (
          <>
            <header className="mb-3 flex items-center gap-2">
              <input
                value={selected.title}
                onChange={(e) =>
                  setNotes((prev) => updateNote(prev, selected.id, { title: e.target.value }))
                }
                placeholder="Titel…"
                className="w-full rounded-md border border-line bg-night px-3 py-2 font-serif text-lg text-gold placeholder:text-muted focus:border-gold focus:outline-none"
              />
              <button
                onClick={() => setPreview((p) => !p)}
                className="shrink-0 rounded-md border border-line px-3 py-2 text-sm text-ink transition-colors hover:border-gold hover:text-gold"
              >
                {preview ? 'Bearbeiten' : 'Vorschau'}
              </button>
              <button
                aria-label="Notiz löschen"
                onClick={() => {
                  setNotes((prev) => removeNote(prev, selected.id))
                  setSelectedId(null)
                }}
                className="shrink-0 rounded-md border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-gold hover:text-gold"
              >
                ✕
              </button>
            </header>

            {preview ? (
              <div className="min-h-64 space-y-3 rounded-md border border-line bg-night p-4 text-sm">
                {selected.content.trim() === '' ? (
                  <p className="text-muted">Diese Notiz ist noch leer.</p>
                ) : (
                  renderMarkdown(selected.content, {
                    onWikiLink: openWikiLink,
                    wikiLinkExists: (t) => findByTitle(notes, t) !== undefined,
                  })
                )}
              </div>
            ) : (
              <textarea
                value={selected.content}
                onChange={(e) =>
                  setNotes((prev) => updateNote(prev, selected.id, { content: e.target.value }))
                }
                placeholder={'Markdown unterstützt: # Überschrift, **fett**, - Liste, [[Wikilink]] …'}
                className="min-h-64 w-full resize-y rounded-md border border-line bg-night p-4 font-mono text-sm leading-relaxed placeholder:text-muted focus:border-gold focus:outline-none"
              />
            )}
          </>
        )}
      </section>
    </div>
  )
}
