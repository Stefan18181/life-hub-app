import { isoDate } from './date'
import { REPEAT_LABELS, type Repeat } from './events'

export type { Repeat }
export { REPEAT_LABELS }

export interface Todo {
  id: string
  text: string
  done: boolean
  /** ISO-Zeitstempel der Erstellung */
  createdAt: string
  /** Optionales Fälligkeitsdatum (ISO, "YYYY-MM-DD"). */
  due?: string
  /** Wiederkehrende Aufgabe: rollt beim Abhaken zum nächsten Termin weiter. */
  repeat?: Repeat
}

const STORAGE_KEY = 'life-hub.todos.v1'

export function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return sortTodos(
      parsed.filter(
        (t): t is Todo =>
          typeof t === 'object' &&
          t !== null &&
          typeof (t as Todo).id === 'string' &&
          typeof (t as Todo).text === 'string' &&
          typeof (t as Todo).done === 'boolean' &&
          typeof (t as Todo).createdAt === 'string',
      ),
    )
  } catch {
    return []
  }
}

export function saveTodos(todos: Todo[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

export interface TodoOptions {
  due?: string
  repeat?: Repeat
}

export function addTodo(todos: Todo[], text: string, opts: TodoOptions = {}): Todo[] {
  // Eine Wiederholung braucht ein Startdatum – ohne Angabe ab heute.
  const due = opts.repeat ? opts.due || isoDate(new Date()) : opts.due
  const todo: Todo = {
    id: crypto.randomUUID(),
    text,
    done: false,
    createdAt: new Date().toISOString(),
    ...(due ? { due } : {}),
    ...(opts.repeat ? { repeat: opts.repeat } : {}),
  }
  return sortTodos([...todos, todo])
}

/**
 * Haken/Enthaken. Wiederkehrende Aufgaben werden nicht "erledigt", sondern
 * zum nächsten Termin weitergerollt (das Fälligkeitsdatum springt vor).
 */
export function toggleTodo(todos: Todo[], id: string): Todo[] {
  return sortTodos(
    todos.map((t) => {
      if (t.id !== id) return t
      if (t.repeat && t.due && !t.done) {
        return { ...t, due: nextDue(t.due, t.repeat) }
      }
      return { ...t, done: !t.done }
    }),
  )
}

/** Nächster Termin einer Wiederholung, der nach heute liegt. */
export function nextDue(due: string, repeat: Repeat, today: Date = new Date()): string {
  const todayIso = isoDate(today)
  const d = new Date(due + 'T00:00')
  const step = () => {
    if (repeat === 'daily') d.setDate(d.getDate() + 1)
    else if (repeat === 'weekly') d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
  }
  // Mindestens einen Schritt, dann so lange, bis der Termin in der Zukunft liegt.
  do {
    step()
  } while (isoDate(d) <= todayIso)
  return isoDate(d)
}

export function removeTodo(todos: Todo[], id: string): Todo[] {
  return todos.filter((t) => t.id !== id)
}

/** Ändert den Text einer Aufgabe (ID und Status bleiben). */
export function updateTodo(todos: Todo[], id: string, text: string): Todo[] {
  return sortTodos(todos.map((t) => (t.id === id ? { ...t, text } : t)))
}

export function clearCompleted(todos: Todo[]): Todo[] {
  return todos.filter((t) => !t.done)
}

export function openCount(todos: Todo[]): number {
  return todos.reduce((n, t) => (t.done ? n : n + 1), 0)
}

/** Offen und überfällig (Fälligkeit vor heute), z. B. für Hinweise. */
export function isOverdue(todo: Todo, today: Date = new Date()): boolean {
  return !todo.done && todo.due !== undefined && todo.due < isoDate(today)
}

/**
 * Offene zuerst; darunter datierte Aufgaben nach Fälligkeit (frühste/überfällige
 * oben), undatierte nach Erstellzeit. Erledigte zuletzt.
 */
function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (!a.done) {
      if (a.due && b.due && a.due !== b.due) return a.due.localeCompare(b.due)
      if (a.due && !b.due) return -1
      if (!a.due && b.due) return 1
    }
    return b.createdAt.localeCompare(a.createdAt)
  })
}
