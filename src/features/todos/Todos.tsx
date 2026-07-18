import { useEffect, useState } from 'react'
import {
  addTodo,
  clearCompleted,
  isOverdue,
  loadTodos,
  openCount,
  removeTodo,
  REPEAT_LABELS,
  saveTodos,
  toggleTodo,
  updateTodo,
  type Repeat,
  type Todo,
} from '../../lib/todos'

const REPEAT_NONE = 'none'

/** "2026-07-20" → "20. Juli" bzw. mit Jahr, wenn nicht das laufende. */
function formatDue(iso: string): string {
  const d = new Date(iso + 'T00:00')
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === new Date().getFullYear()
      ? { day: 'numeric', month: 'short' }
      : { day: 'numeric', month: 'short', year: 'numeric' }
  return d.toLocaleDateString('de-DE', opts)
}

export default function Todos({ highlightId }: { highlightId?: string } = {}) {
  const [todos, setTodos] = useState<Todo[]>(() => loadTodos())
  const [input, setInput] = useState('')
  const [due, setDue] = useState('')
  const [repeat, setRepeat] = useState<Repeat | typeof REPEAT_NONE>(REPEAT_NONE)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    saveTodos(todos)
  }, [todos])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setTodos((prev) =>
      addTodo(prev, text, {
        due: due || undefined,
        repeat: repeat === REPEAT_NONE ? undefined : repeat,
      }),
    )
    setInput('')
    setDue('')
    setRepeat(REPEAT_NONE)
  }

  function startEdit(todo: Todo) {
    setEditingId(todo.id)
    setEditText(todo.text)
  }

  function commitEdit() {
    if (editingId === null) return
    const text = editText.trim()
    if (text) setTodos((prev) => updateTodo(prev, editingId, text))
    setEditingId(null)
    setEditText('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
  }

  const open = openCount(todos)
  const doneCount = todos.length - open

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-line bg-card p-6">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl text-gold">To-dos</h2>
        <span className="text-sm text-muted">
          {open} offen{doneCount > 0 && ` · ${doneCount} erledigt`}
        </span>
      </header>

      <form onSubmit={submit} className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Neue Aufgabe …"
            className="w-full rounded-md border border-line bg-night px-3 py-2 text-sm placeholder:text-muted focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            disabled={input.trim() === ''}
            className="shrink-0 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-accentink transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Hinzufügen
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <label className="flex items-center gap-1.5">
            <span>Fällig</span>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              aria-label="Fälligkeitsdatum"
              className="rounded-md border border-line bg-night px-2 py-1 text-ink focus:border-gold focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span>Wiederholung</span>
            <select
              value={repeat}
              onChange={(e) => setRepeat(e.target.value as Repeat | typeof REPEAT_NONE)}
              aria-label="Wiederholung"
              className="rounded-md border border-line bg-night px-2 py-1 text-ink focus:border-gold focus:outline-none"
            >
              <option value={REPEAT_NONE}>keine</option>
              <option value="daily">{REPEAT_LABELS.daily}</option>
              <option value="weekly">{REPEAT_LABELS.weekly}</option>
              <option value="monthly">{REPEAT_LABELS.monthly}</option>
            </select>
          </label>
          {(due || repeat !== REPEAT_NONE) && (
            <button
              type="button"
              onClick={() => {
                setDue('')
                setRepeat(REPEAT_NONE)
              }}
              className="text-muted underline-offset-2 transition-colors hover:text-gold hover:underline"
            >
              zurücksetzen
            </button>
          )}
        </div>
      </form>

      {todos.length === 0 ? (
        <p className="py-6 text-center font-serif text-muted">
          Noch keine Aufgaben — trag oben deine erste ein.
        </p>
      ) : (
        <ul className="space-y-2">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className={
                'flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm ' +
                (todo.id === highlightId ? 'border-gold bg-gold/5' : 'border-line')
              }
            >
              <button
                role="checkbox"
                aria-checked={todo.done}
                aria-label={
                  todo.repeat
                    ? 'Erledigt – zum nächsten Termin weiterrollen'
                    : todo.done
                      ? 'Als offen markieren'
                      : 'Als erledigt markieren'
                }
                onClick={() => setTodos((prev) => toggleTodo(prev, todo.id))}
                className={
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ' +
                  (todo.done
                    ? 'border-gold bg-gold text-accentink'
                    : 'border-line text-transparent hover:border-gold')
                }
              >
                ✓
              </button>
              {editingId === todo.id ? (
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit()
                    else if (e.key === 'Escape') cancelEdit()
                  }}
                  autoFocus
                  aria-label="Aufgabe bearbeiten"
                  className="min-w-0 flex-1 rounded-md border border-gold bg-night px-2 py-1 text-sm text-ink focus:outline-none"
                />
              ) : (
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    onDoubleClick={() => startEdit(todo)}
                    className={
                      'min-w-0 break-words ' + (todo.done ? 'text-muted line-through' : 'text-ink')
                    }
                  >
                    {todo.text}
                  </span>
                  {todo.repeat && (
                    <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                      ⟳ {REPEAT_LABELS[todo.repeat]}
                    </span>
                  )}
                  {todo.due && (
                    <span
                      className={
                        'shrink-0 rounded-full px-2 py-0.5 text-xs ' +
                        (isOverdue(todo)
                          ? 'bg-red-500/15 text-red-400'
                          : 'border border-line text-muted')
                      }
                    >
                      {isOverdue(todo) ? 'überfällig · ' : ''}
                      {formatDue(todo.due)}
                    </span>
                  )}
                </div>
              )}
              {editingId !== todo.id && (
                <button
                  aria-label={`"${todo.text}" bearbeiten`}
                  onClick={() => startEdit(todo)}
                  className="shrink-0 text-muted transition-colors hover:text-gold"
                >
                  ✎
                </button>
              )}
              <button
                aria-label={`"${todo.text}" löschen`}
                onClick={() => setTodos((prev) => removeTodo(prev, todo.id))}
                className="shrink-0 text-muted transition-colors hover:text-gold"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {doneCount > 0 && (
        <div className="mt-4 text-right">
          <button
            onClick={() => setTodos((prev) => clearCompleted(prev))}
            className="rounded-md border border-line px-3 py-1 text-sm text-muted transition-colors hover:border-gold hover:text-gold"
          >
            Erledigte löschen
          </button>
        </div>
      )}
    </div>
  )
}
