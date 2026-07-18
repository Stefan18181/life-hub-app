import Anthropic from '@anthropic-ai/sdk'
import { categoryName, defaultCategoryNames, type CategoryNames } from './categories'
import { EVENT_COLORS } from './colors'
import { isoDate } from './date'
import {
  addEvent,
  loadEvents,
  nextOccurrence,
  removeEvent,
  REPEAT_LABELS,
  saveEvents,
  type CalendarEvent,
} from './events'
import {
  addNote,
  findByTitle,
  loadNotes,
  saveNotes,
  updateNote,
  type Note,
} from './notes'
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
  catNames: CategoryNames = defaultCategoryNames(),
): string {
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + 14)
  const from = isoDate(today)
  const to = isoDate(horizon)

  // nextOccurrence statt e.date, damit laufende Wiederholungen und
  // Mehrtages-Spannen (Start in der Vergangenheit) sichtbar sind.
  const upcoming = events
    .map((e) => ({ event: e, occ: nextOccurrence(e, from) }))
    .filter((x): x is { event: CalendarEvent; occ: string } => x.occ !== null && x.occ <= to)
    .sort((a, b) => a.occ.localeCompare(b.occ))
  const eventLines =
    upcoming.length === 0
      ? '(keine Termine in den nächsten 14 Tagen)'
      : upcoming
          .map(({ event: e, occ }) => {
            const extras = [
              e.time ? `${e.time} Uhr` : '',
              e.repeat ? `wiederholt sich ${REPEAT_LABELS[e.repeat]}` : '',
              e.endDate && e.endDate > e.date ? `bis ${e.endDate}` : '',
              e.color ? `Kategorie: ${categoryName(catNames, e.color)}` : '',
            ]
              .filter(Boolean)
              .join(', ')
            return `- ${occ}${extras ? ` (${extras})` : ''}: ${e.title}`
          })
          .join('\n')

  const categoryLines = EVENT_COLORS.map(
    (c) => `- ${c.key} = „${categoryName(catNames, c.key)}"`,
  ).join('\n')

  const noteLines =
    notes.length === 0
      ? '(keine Notizen vorhanden)'
      : notes.map((n) => `- ${n.title || 'Ohne Titel'}`).join('\n')

  const openTodos = todos.filter((t) => !t.done)
  const todoLines =
    openTodos.length === 0
      ? '(keine offenen To-dos)'
      : openTodos
          .map((t) => {
            const extras = [
              t.repeat ? `wiederholt sich ${REPEAT_LABELS[t.repeat]}` : '',
              t.due ? `fällig ${t.due}` : '',
            ]
              .filter(Boolean)
              .join(', ')
            return `- ${t.text}${extras ? ` (${extras})` : ''}`
          })
          .join('\n')

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

Termin-Kategorien (Schlüssel = Name des Nutzers):
${categoryLines}

Beziehe dich auf diese Daten, wenn der Nutzer nach Terminen, Notizen oder To-dos fragt. Inhalte der Notizen kennst du nicht, nur die Titel.

Du kannst Termine im Kalender anlegen und löschen (Werkzeuge add_event und remove_event), To-dos anlegen, abhaken und löschen (Werkzeuge add_todo, complete_todo und remove_todo) sowie Notizen anlegen und ergänzen (Werkzeuge create_note und append_to_note). Beim Anlegen eines Termins kannst du optional eine Kategorie (category, nutze den Schlüssel aus der Liste oben, wenn der Nutzer eine Kategorie nennt) und für mehrtägige Termine ein Enddatum (end_date) angeben. Beim Anlegen einer Aufgabe kannst du optional ein Fälligkeitsdatum (due) und eine Wiederholung (repeat: daily/weekly/monthly) angeben – z. B. „erinnere mich jeden Freitag ans Gießen" als wiederkehrende Aufgabe. Wenn der Nutzer dich darum bittet, nutze das passende Werkzeug direkt. Rechne relative Datumsangaben wie „morgen", „Donnerstag" oder „nächste Woche" anhand des heutigen Datums selbst in ein ISO-Datum (YYYY-MM-DD) um. Wenn eine Angabe unklar ist (z. B. welcher von mehreren Einträgen gemeint ist), frag lieber kurz nach, statt zu raten. Bestätige nach einer Änderung kurz, was du eingetragen, abgehakt oder gelöscht hast.`
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
        end_date: {
          type: 'string',
          description:
            'Optionales Enddatum (YYYY-MM-DD) für mehrtägige Termine; muss nach "date" liegen',
        },
        category: {
          type: 'string',
          enum: EVENT_COLORS.map((c) => c.key),
          description:
            'Optionale Kategorie (Schlüssel). Die Namen der Kategorien stehen im System-Prompt.',
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
  const span = e.endDate && e.endDate > e.date ? ` bis ${e.endDate}` : ''
  return `${e.date}${span}${e.time ? ` ${e.time} Uhr` : ''} – ${e.title}`
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
    if (args.end_date !== undefined && args.end_date !== '') {
      if (!isIsoDate(args.end_date)) {
        return { summary: 'Fehler: "end_date" muss im Format YYYY-MM-DD vorliegen.', isError: true }
      }
      if (args.end_date <= args.date) {
        return { summary: 'Fehler: "end_date" muss nach "date" liegen.', isError: true }
      }
    }
    const endDate = isIsoDate(args.end_date) && args.end_date > args.date ? args.end_date : undefined
    if (
      args.category !== undefined &&
      args.category !== '' &&
      !EVENT_COLORS.some((c) => c.key === args.category)
    ) {
      const valid = EVENT_COLORS.map((c) => c.key).join(', ')
      return { summary: `Fehler: unbekannte Kategorie "${String(args.category)}" (gültig: ${valid}).`, isError: true }
    }
    // Gold ist der Standard und wird wie in der UI nicht gespeichert.
    const color =
      typeof args.category === 'string' && args.category !== '' && args.category !== 'gold'
        ? args.category
        : undefined
    const updated = addEvent(loadEvents(), { date: args.date, title, time, endDate, color })
    saveEvents(updated)
    return {
      summary: `Termin hinzugefügt: ${formatEvent({ id: '', date: args.date, title, time, endDate, color })}`,
      isError: false,
    }
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
    description:
      'Legt eine neue Aufgabe in der To-do-Liste des Nutzers an. Optional mit ' +
      'Fälligkeitsdatum und Wiederholung (z. B. "jeden Freitag gießen").',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Kurzer Text der Aufgabe, z. B. "Milch kaufen"' },
        due: {
          type: 'string',
          description:
            'Optionales Fälligkeitsdatum (YYYY-MM-DD). Bei einer Wiederholung ist das der ' +
            'erste Termin; ohne Angabe wird dann heute verwendet. Relative Angaben selbst umrechnen.',
        },
        repeat: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly'],
          description:
            'Optionale Wiederholung: daily (täglich), weekly (wöchentlich) oder monthly (monatlich).',
        },
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

/** Werkzeuge, mit denen Claude Notizen im Browser anlegen und ergänzen darf. */
export const NOTE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_note',
    description: 'Legt eine neue Notiz mit Titel und optionalem Markdown-Inhalt an.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titel der Notiz' },
        content: { type: 'string', description: 'Optionaler Markdown-Inhalt der Notiz' },
      },
      required: ['title'],
    },
  },
  {
    name: 'append_to_note',
    description:
      'Hängt Text an eine bestehende Notiz (per Titel gefunden, Groß-/Kleinschreibung egal) an. ' +
      'Existiert keine Notiz mit dem Titel, wird eine neue mit diesem Text angelegt.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titel der Zielnotiz' },
        text: { type: 'string', description: 'Anzuhängender Markdown-Text' },
      },
      required: ['title', 'text'],
    },
  },
]

/** Alle Werkzeuge, die Claude im Chat nutzen darf. */
export const CLAUDE_TOOLS: Anthropic.Tool[] = [...EVENT_TOOLS, ...TODO_TOOLS, ...NOTE_TOOLS]

/** Legt eine neue Notiz mit Titel und Inhalt an und speichert sie. */
function createNoteWithContent(title: string, content: string): void {
  const before = loadNotes()
  const withNote = addNote(before, title)
  const created = withNote.find((n) => !before.some((b) => b.id === n.id))
  saveNotes(created ? updateNote(withNote, created.id, { content }) : withNote)
}

/**
 * Führt einen von Claude angeforderten Notiz-Werkzeugaufruf gegen die lokal
 * gespeicherten Notizen aus (loadNotes/saveNotes im localStorage).
 */
export function runNoteTool(name: string, input: unknown): ToolOutcome {
  const args = (input ?? {}) as Record<string, unknown>
  const title = typeof args.title === 'string' ? args.title.trim() : ''

  if (name === 'create_note') {
    if (!title) {
      return { summary: 'Fehler: "title" darf nicht leer sein.', isError: true }
    }
    const content = typeof args.content === 'string' ? args.content : ''
    createNoteWithContent(title, content)
    return { summary: `Notiz angelegt: ${title}`, isError: false }
  }

  if (name === 'append_to_note') {
    if (!title) {
      return { summary: 'Fehler: "title" darf nicht leer sein.', isError: true }
    }
    const text = typeof args.text === 'string' ? args.text : ''
    if (!text.trim()) {
      return { summary: 'Fehler: "text" darf nicht leer sein.', isError: true }
    }
    const notes = loadNotes()
    const existing = findByTitle(notes, title)
    if (existing) {
      const sep = existing.content.trim() ? '\n\n' : ''
      saveNotes(updateNote(notes, existing.id, { content: existing.content + sep + text }))
      return { summary: `Text an Notiz „${existing.title}" angehängt.`, isError: false }
    }
    createNoteWithContent(title, text)
    return { summary: `Notiz „${title}" gab es noch nicht — neu angelegt.`, isError: false }
  }

  return { summary: `Unbekanntes Werkzeug: ${name}`, isError: true }
}

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
    if (args.due !== undefined && args.due !== '' && !isIsoDate(args.due)) {
      return { summary: 'Fehler: "due" muss im Format YYYY-MM-DD vorliegen.', isError: true }
    }
    const repeat =
      args.repeat === 'daily' || args.repeat === 'weekly' || args.repeat === 'monthly'
        ? args.repeat
        : undefined
    if (args.repeat !== undefined && args.repeat !== '' && !repeat) {
      return {
        summary: 'Fehler: "repeat" muss daily, weekly oder monthly sein.',
        isError: true,
      }
    }
    const due = isIsoDate(args.due) ? args.due : undefined
    saveTodos(addTodo(loadTodos(), text, { due, repeat }))
    // Wie in addTodo: eine Wiederholung erhält ohne Datum "heute" als Start.
    const effectiveDue = repeat ? due ?? isoDate(new Date()) : due
    const extras = [
      repeat ? `wiederholt sich ${REPEAT_LABELS[repeat]}` : '',
      effectiveDue ? `fällig ${effectiveDue}` : '',
    ]
      .filter(Boolean)
      .join(', ')
    return { summary: `Aufgabe hinzugefügt: ${text}${extras ? ` (${extras})` : ''}`, isError: false }
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

/** Verteilt einen Werkzeugaufruf an die passende Umsetzung (Termine, To-dos, Notizen). */
export function runTool(name: string, input: unknown): ToolOutcome {
  if (name === 'add_todo' || name === 'complete_todo' || name === 'remove_todo') {
    return runTodoTool(name, input)
  }
  if (name === 'create_note' || name === 'append_to_note') {
    return runNoteTool(name, input)
  }
  return runEventTool(name, input)
}
