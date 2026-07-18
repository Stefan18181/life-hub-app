import { loadCategoryNames, saveCategoryNames, type CategoryNames } from './categories'
import { loadEvents, saveEvents, type CalendarEvent } from './events'
import { loadNotes, saveNotes, type Note } from './notes'
import { loadTodos, saveTodos, type Todo } from './todos'

export const BACKUP_APP = 'life-hub'
export const BACKUP_VERSION = 1

export interface BackupData {
  events: CalendarEvent[]
  todos: Todo[]
  notes: Note[]
  categories: CategoryNames
}

export interface Backup extends BackupData {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
}

/** Sammelt alle lokalen Daten in ein versioniertes Backup-Objekt. */
export function buildBackup(now: Date = new Date()): Backup {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    events: loadEvents(),
    todos: loadTodos(),
    notes: loadNotes(),
    categories: loadCategoryNames(),
  }
}

/** Hübsch formatiertes JSON für den Datei-Download. */
export function serializeBackup(backup: Backup = buildBackup()): string {
  return JSON.stringify(backup, null, 2) + '\n'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function str(value: unknown): value is string {
  return typeof value === 'string'
}

function isEvent(v: unknown): v is CalendarEvent {
  return isRecord(v) && str(v.id) && str(v.date) && str(v.title)
}

function isTodo(v: unknown): v is Todo {
  return isRecord(v) && str(v.id) && str(v.text) && typeof v.done === 'boolean' && str(v.createdAt)
}

function isNote(v: unknown): v is Note {
  return isRecord(v) && str(v.id) && str(v.title) && str(v.content) && str(v.updatedAt)
}

function isCategories(v: unknown): v is CategoryNames {
  return isRecord(v) && Object.values(v).every(str)
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/**
 * Liest ein Backup aus JSON und behält nur strukturell gültige Einträge.
 * Wirft einen Fehler, wenn es sich nicht um ein Life-Hub-Backup handelt.
 */
export function parseBackup(json: string): BackupData {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.')
  }
  if (!isRecord(parsed) || parsed.app !== BACKUP_APP) {
    throw new Error('Das ist keine Life-Hub-Sicherungsdatei.')
  }
  return {
    events: arr(parsed.events).filter(isEvent),
    todos: arr(parsed.todos).filter(isTodo),
    notes: arr(parsed.notes).filter(isNote),
    categories: isCategories(parsed.categories) ? parsed.categories : {},
  }
}

export interface ImportResult {
  events: number
  todos: number
  notes: number
}

/** Ersetzt alle lokalen Daten durch das Backup und meldet die übernommenen Zahlen. */
export function applyBackup(data: BackupData): ImportResult {
  saveEvents(data.events)
  saveTodos(data.todos)
  saveNotes(data.notes)
  saveCategoryNames(data.categories)
  return {
    events: data.events.length,
    todos: data.todos.length,
    notes: data.notes.length,
  }
}
