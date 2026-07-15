import { useEffect, useState } from 'react'
import {
  addTodo,
  clearCompleted,
  loadTodos,
  openCount,
  removeTodo,
  saveTodos,
  toggleTodo,
  updateTodo,
  type Todo,
} from '../../lib/todos'

export default function Todos({ highlightId }: { highlightId?: string } = {}) {
  const [todos, setTodos] = useState<Todo[]>(() => loadTodos())
  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    saveTodos(todos)
  }, [todos])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setTodos((prev) => addTodo(prev, text))
    setInput('')
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

      <form onSubmit={submit} className="mb-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Neue Aufgabe …"
          className="w-full rounded-md border border-line bg-night px-3 py-2 text-sm placeholder:text-muted focus:border-gold focus:outline-none"
        />
        <button
          type="submit"
          disabled={input.trim() === ''}
          className="shrink-0 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-night transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Hinzufügen
        </button>
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
                aria-label={todo.done ? 'Als offen markieren' : 'Als erledigt markieren'}
                onClick={() => setTodos((prev) => toggleTodo(prev, todo.id))}
                className={
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ' +
                  (todo.done
                    ? 'border-gold bg-gold text-night'
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
                <span
                  onDoubleClick={() => startEdit(todo)}
                  className={
                    'min-w-0 flex-1 break-words ' +
                    (todo.done ? 'text-muted line-through' : 'text-ink')
                  }
                >
                  {todo.text}
                </span>
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
