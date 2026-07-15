export interface Todo {
  id: string
  text: string
  done: boolean
  /** ISO-Zeitstempel der Erstellung */
  createdAt: string
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

export function addTodo(todos: Todo[], text: string): Todo[] {
  const todo: Todo = {
    id: crypto.randomUUID(),
    text,
    done: false,
    createdAt: new Date().toISOString(),
  }
  return sortTodos([...todos, todo])
}

export function toggleTodo(todos: Todo[], id: string): Todo[] {
  return sortTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
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

/** Offene zuerst, innerhalb jeder Gruppe die neuesten oben. */
function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return b.createdAt.localeCompare(a.createdAt)
  })
}
