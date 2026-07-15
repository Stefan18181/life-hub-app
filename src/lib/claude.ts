import Anthropic from '@anthropic-ai/sdk'
import { isoDate } from './date'
import { addEvent, loadEvents, removeEvent, saveEvents, type CalendarEvent } from './events'
import type { Note } from './notes'
import { addTodo, loadTodos, removeTodo, saveTodos, toggleTodo, type Todo } from './todos'

const KEY_STORAGE = 'life-hub.claude-key.v1'

export const CLAUDE_MODEL = 'claude-opus-4-8'

export function loadApiKey(): string | null {
  return localStorage.getItem(KEY_STORAGE)
}

export function saveApiKey(key: string): void {
  localStorage.setItem(KEY_STORAGE, key)
}

export function clearApiKey(): void {
  localStorage.removeItem(KEY_STORAGE)
}

/**
 * Der Key bleibt im Browser (localStorage) und geht nur an die Anthropic API.
 * dangerouslyAllowBrowser ist hier bewusst gesetzt: Life Hub ist eine lokale
 * Einzelnutzer-PWA mit dem eigenen Key des Nutzers, kein geteilter Server-Key.
 */
export function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

/**
 * Baut den System-Prompt inklusive Kontext aus Kalender und Notizen,
 * damit Claude Fragen wie "Was steht diese Woche an?" beantworten kann.
 */
export function buildSystemPrompt(
  events: CalendarEvent[],
  notes: Note[],
  today: Date,
  todos: Todo[] = [],
): string {
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + 14)
  const from = isoDate(today)
  const to = isoDate(horizon)

  const upcoming = events.filter((e) => e.date >= from && e.date <= to)
  const eventLines =
    upcoming.length === 0
      ? '(keine Termine in den nächsten 14 Tagen)'
      : upcoming
          .map((e) => `- ${e.date}${e.time ? ` ${e.time} Uhr` : ''}: ${e.title}`)
          .join('\n')

  const noteLines =
    notes.length === 0
      ? '(keine Notizen vorhanden)'
      : notes.map((n) => `- ${n.title || 'Ohne Titel'}`).join('\n')

  const openTodos = todos.filter((t) => !t.done)
  const todoLines =
    openTodos.length === 0
      ? '(keine offenen To-dos)'
      : openTodos.map((t) => `- ${t.text}`).join('\n')

  const todayLabel = today.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return `Du bist der persönliche Assistent in "Life Hub", einer privaten Organisations-App. Antworte auf Deutsch, freundlich und prägnant.

Heute ist ${todayLabel}.

Termine des Nutzers (nächste 14 Tage):
${eventLines}

Titel der Notizen des Nutzers:
${noteLines}

Offene To-dos des Nutzers:
${todoLines}

Beziehe dich auf diese Daten, wenn der Nutzer nach Terminen, Notizen oder To-dos fragt. Inhalte der Notizen kennst du nicht, nur die Titel.

Du kannst Termine im Kalender anlegen und löschen (Werkzeuge add_event und remove_event) sowie To-dos anlegen, abhaken und löschen (Werkzeuge add_todo, complete_todo und remove_todo). Wenn der Nutzer dich darum bittet, nutze das passende Werkzeug direkt. Rechne relative Datumsangaben wie „morgen", „Donnerstag" oder „nächste Woche" anhand des heutigen Datums selbst in ein ISO-Datum (YYYY-MM-DD) um. Wenn eine Angabe unklar ist (z. B. welcher von mehreren Einträgen gemeint ist), frag lieber kurz nach, statt zu raten. Bestätige nach einer Änderung kurz, was du eingetragen, abgehakt oder gelöscht hast.`
}

/** Werkzeuge, mit denen Claude den Kalender im Browser verändern darf. */
export const EVENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'add_event',
    description:
      'Legt einen neuen Termin im Kalender des Nutzers an. Wandle relative Datumsangaben ' +
      'anhand des heutigen Datums selbst in ein ISO-Datum (YYYY-MM-DD) um.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Datum im Format YYYY-MM-DD' },
        title: { type: 'string', description: 'Kurzer Titel des Termins, z. B. "Friseur"' },
        time: {
          type: 'string',
          description: 'Optionale Uhrzeit im 24-Stunden-Format HH:MM, z. B. "17:30"',
        },
      },
      required: ['date', 'title'],
    },
  },
  {
    name: 'remove_event',
    description:
      'Löscht Termine an einem bestimmten Datum. Ohne Titel werden alle Termine des Tages ' +
      'gelöscht; mit Titel nur die, deren Titel den Text enthält (Groß-/Kleinschreibung egal).',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Datum im Format YYYY-MM-DD' },
        title: {
          type: 'string',
          description: 'Optionaler Titel-Text zum Eingrenzen, welche Termine gelöscht werden',
        },
      },
      required: ['date'],
    },
  },
]

export interface ToolOutcome {
  /** Kurze, für den Nutzer lesbare Zusammenfassung des Ergebnisses. */
  summary: string
  /** True, wenn das Werkzeug fehlschlug (wird als is_error an Claude zurückgegeben). */
  isError: boolean
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function formatEvent(e: CalendarEvent): string {
  return `${e.date}${e.time ? ` ${e.time} Uhr` : ''} – ${e.title}`
}

/**
 * Führt einen von Claude angeforderten Werkzeugaufruf gegen die lokal
 * gespeicherten Termine aus (loadEvents/saveEvents im localStorage).
 */
export function runEventTool(name: string, input: unknown): ToolOutcome {
  const args = (input ?? {}) as Record<string, unknown>

  if (name === 'add_event') {
    if (!isIsoDate(args.date)) {
      return { summary: 'Fehler: "date" muss im Format YYYY-MM-DD vorliegen.', isError: true }
    }
    const title = typeof args.title === 'string' ? args.title.trim() : ''
    if (!title) {
      return { summary: 'Fehler: "title" darf nicht leer sein.', isError: true }
    }
    if (args.time !== undefined && args.time !== '' && !isValidTime(args.time)) {
      return { summary: 'Fehler: "time" muss im Format HH:MM (24h) vorliegen.', isError: true }
    }
    const time = isValidTime(args.time) ? args.time : undefined
    const updated = addEvent(loadEvents(), { date: args.date, title, time })
    saveEvents(updated)
    return { summary: `Termin hinzugefügt: ${formatEvent({ id: '', date: args.date, title, time })}`, isError: false }
  }

  if (name === 'remove_event') {
    if (!isIsoDate(args.date)) {
      return { summary: 'Fehler: "date" muss im Format YYYY-MM-DD vorliegen.', isError: true }
    }
    const filter = typeof args.title === 'string' ? args.title.trim().toLowerCase() : ''
    const events = loadEvents()
    const matches = events.filter(
      (e) => e.date === args.date && (filter === '' || e.title.toLowerCase().includes(filter)),
    )
    if (matches.length === 0) {
      return { summary: `Kein passender Termin am ${args.date} gefunden.`, isError: false }
    }
    const remaining = matches.reduce((acc, e) => removeEvent(acc, e.id), events)
    saveEvents(remaining)
    const list = matches.map(formatEvent).join(', ')
    return { summary: `${matches.length} Termin(e) gelöscht: ${list}`, isError: false }
  }

  return { summary: `Unbekanntes Werkzeug: ${name}`, isError: true }
}

/** Werkzeuge, mit denen Claude die To-do-Liste im Browser verändern darf. */
export const TODO_TOOLS: Anthropic.Tool[] = [
  {
    name: 'add_todo',
    description: 'Legt eine neue Aufgabe in der To-do-Liste des Nutzers an.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Kurzer Text der Aufgabe, z. B. "Milch kaufen"' },
      },
      required: ['text'],
    },
  },
  {
    name: 'complete_todo',
    description:
      'Hakt offene Aufgaben ab, deren Text den angegebenen Text enthält ' +
      '(Groß-/Kleinschreibung egal).',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text-Ausschnitt der abzuhakenden Aufgabe(n)' },
      },
      required: ['text'],
    },
  },
  {
    name: 'remove_todo',
    description:
      'Löscht Aufgaben, deren Text den angegebenen Text enthält (Groß-/Kleinschreibung egal).',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text-Ausschnitt der zu löschenden Aufgabe(n)' },
      },
      required: ['text'],
    },
  },
]

/** Alle Werkzeuge, die Claude im Chat nutzen darf. */
export const CLAUDE_TOOLS: Anthropic.Tool[] = [...EVENT_TOOLS, ...TODO_TOOLS]

/**
 * Führt einen von Claude angeforderten To-do-Werkzeugaufruf gegen die lokal
 * gespeicherten Aufgaben aus (loadTodos/saveTodos im localStorage).
 */
export function runTodoTool(name: string, input: unknown): ToolOutcome {
  const args = (input ?? {}) as Record<string, unknown>
  const text = typeof args.text === 'string' ? args.text.trim() : ''

  if (name === 'add_todo') {
    if (!text) {
      return { summary: 'Fehler: "text" darf nicht leer sein.', isError: true }
    }
    saveTodos(addTodo(loadTodos(), text))
    return { summary: `Aufgabe hinzugefügt: ${text}`, isError: false }
  }

  if (name === 'complete_todo' || name === 'remove_todo') {
    if (!text) {
      return { summary: 'Fehler: "text" darf nicht leer sein.', isError: true }
    }
    const filter = text.toLowerCase()
    const todos = loadTodos()
    const relevant =
      name === 'complete_todo'
        ? todos.filter((t) => !t.done && t.text.toLowerCase().includes(filter))
        : todos.filter((t) => t.text.toLowerCase().includes(filter))

    if (relevant.length === 0) {
      const was = name === 'complete_todo' ? 'offene ' : ''
      return { summary: `Keine passende ${was}Aufgabe für „${text}" gefunden.`, isError: false }
    }

    const updated = relevant.reduce(
      (acc, t) => (name === 'complete_todo' ? toggleTodo(acc, t.id) : removeTodo(acc, t.id)),
      todos,
    )
    saveTodos(updated)
    const verb = name === 'complete_todo' ? 'abgehakt' : 'gelöscht'
    const list = relevant.map((t) => t.text).join(', ')
    return { summary: `${relevant.length} Aufgabe(n) ${verb}: ${list}`, isError: false }
  }

  return { summary: `Unbekanntes Werkzeug: ${name}`, isError: true }
}

/** Verteilt einen Werkzeugaufruf an die passende Umsetzung (Termine oder To-dos). */
export function runTool(name: string, input: unknown): ToolOutcome {
  if (name === 'add_todo' || name === 'complete_todo' || name === 'remove_todo') {
    return runTodoTool(name, input)
  }
  return runEventTool(name, input)
}
