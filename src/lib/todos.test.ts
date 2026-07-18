import { beforeEach, describe, expect, it } from 'vitest'
import {
  addTodo,
  clearCompleted,
  isOverdue,
  loadTodos,
  nextDue,
  openCount,
  removeTodo,
  saveTodos,
  toggleTodo,
  updateTodo,
  type Todo,
} from './todos'

describe('updateTodo', () => {
  it('ändert nur den Text und lässt ID und Status unberührt', () => {
    const todos: Todo[] = [
      { id: 'a', text: 'Alt', done: true, createdAt: '2026-07-13T10:00:00Z' },
      { id: 'b', text: 'Andere', done: false, createdAt: '2026-07-13T09:00:00Z' },
    ]
    const after = updateTodo(todos, 'a', 'Neu')
    const a = after.find((t) => t.id === 'a')!
    expect(a).toEqual({ id: 'a', text: 'Neu', done: true, createdAt: '2026-07-13T10:00:00Z' })
    expect(after.find((t) => t.id === 'b')?.text).toBe('Andere')
  })
})

describe('addTodo / toggleTodo', () => {
  it('legt offene Aufgaben an und schiebt Erledigte ans Ende', () => {
    let todos: Todo[] = []
    todos = addTodo(todos, 'A')
    todos = addTodo(todos, 'B')
    todos = addTodo(todos, 'C')
    expect(todos).toHaveLength(3)
    expect(todos.every((t) => !t.done)).toBe(true)

    const bId = todos.find((t) => t.text === 'B')!.id
    todos = toggleTodo(todos, bId)
    expect(todos.at(-1)?.text).toBe('B')
    expect(todos.slice(0, 2).every((t) => !t.done)).toBe(true)
  })
})

describe('removeTodo / clearCompleted / openCount', () => {
  it('entfernt einzelne und alle erledigten Aufgaben', () => {
    let todos: Todo[] = []
    todos = addTodo(todos, 'A')
    todos = addTodo(todos, 'B')
    todos = addTodo(todos, 'C')
    todos = toggleTodo(todos, todos.find((t) => t.text === 'A')!.id)
    todos = toggleTodo(todos, todos.find((t) => t.text === 'B')!.id)

    expect(openCount(todos)).toBe(1)

    todos = removeTodo(todos, todos.find((t) => t.text === 'C')!.id)
    expect(todos).toHaveLength(2)

    todos = clearCompleted(todos)
    expect(todos).toEqual([])
  })
})

describe('loadTodos / saveTodos', () => {
  beforeEach(() => localStorage.clear())

  it('lädt gespeicherte Aufgaben zurück', () => {
    const todos = addTodo([], 'Test')
    saveTodos(todos)
    expect(loadTodos()).toEqual(todos)
  })

  it('ignoriert kaputte oder fremde Daten', () => {
    localStorage.setItem('life-hub.todos.v1', 'kein json {')
    expect(loadTodos()).toEqual([])
    localStorage.setItem('life-hub.todos.v1', JSON.stringify([{ text: 'ohne id' }, null]))
    expect(loadTodos()).toEqual([])
  })

  it('sortiert offene nach Datum absteigend, Erledigte ganz ans Ende', () => {
    const raw: Todo[] = [
      { id: '1', text: 'alt', done: false, createdAt: '2026-07-10T10:00:00Z' },
      { id: '2', text: 'neu', done: false, createdAt: '2026-07-12T10:00:00Z' },
      { id: '3', text: 'fertig', done: true, createdAt: '2026-07-13T10:00:00Z' },
    ]
    localStorage.setItem('life-hub.todos.v1', JSON.stringify(raw))
    expect(loadTodos().map((t) => t.text)).toEqual(['neu', 'alt', 'fertig'])
  })
})

describe('wiederkehrende To-dos', () => {
  const today = new Date('2026-07-18T12:00:00')

  it('nextDue springt zum nächsten Termin in der Zukunft', () => {
    expect(nextDue('2026-07-18', 'daily', today)).toBe('2026-07-19')
    expect(nextDue('2026-07-18', 'weekly', today)).toBe('2026-07-25')
    expect(nextDue('2026-07-18', 'monthly', today)).toBe('2026-08-18')
  })

  it('nextDue holt überfällige Wiederholungen bis in die Zukunft nach', () => {
    // Täglich, seit einer Woche überfällig → nächster Termin ist morgen
    expect(nextDue('2026-07-10', 'daily', today)).toBe('2026-07-19')
  })

  it('addTodo mit repeat setzt ein Fälligkeitsdatum (Default heute)', () => {
    const [todo] = addTodo([], 'Müll rausbringen', { repeat: 'weekly' })
    expect(todo.repeat).toBe('weekly')
    expect(todo.due).toBeTruthy()
  })

  it('Abhaken einer Wiederholung rollt weiter statt zu erledigen', () => {
    const todos = addTodo([], 'Gießen', { repeat: 'daily', due: '2026-07-18' })
    const rolled = toggleTodo(todos, todos[0].id)
    expect(rolled[0].done).toBe(false)
    expect(rolled[0].due! > '2026-07-18').toBe(true)
  })

  it('isOverdue erkennt offene Aufgaben mit vergangener Fälligkeit', () => {
    const overdue: Todo = { id: 'x', text: 'X', done: false, createdAt: '2026-07-01T00:00:00Z', due: '2026-07-10' }
    const future: Todo = { id: 'y', text: 'Y', done: false, createdAt: '2026-07-01T00:00:00Z', due: '2026-07-30' }
    expect(isOverdue(overdue, today)).toBe(true)
    expect(isOverdue(future, today)).toBe(false)
  })

  it('sortiert datierte Aufgaben nach Fälligkeit vor undatierten', () => {
    let todos: Todo[] = []
    todos = addTodo(todos, 'ohne Datum')
    todos = addTodo(todos, 'spät', { due: '2026-07-30' })
    todos = addTodo(todos, 'früh', { due: '2026-07-20' })
    expect(todos.map((t) => t.text)).toEqual(['früh', 'spät', 'ohne Datum'])
  })
})
