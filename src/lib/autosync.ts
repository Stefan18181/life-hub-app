import { loadEvents } from './events'
import { loadNotes } from './notes'
import { loadTodos } from './todos'

const SNAPSHOT_KEY = 'life-hub.sync.snapshot.v1'
const TIME_KEY = 'life-hub.sync.time.v1'

/** Serialisiert den gesamten lokalen Datenbestand – Grundlage der Änderungserkennung. */
export function currentSnapshot(): string {
  return JSON.stringify({ events: loadEvents(), todos: loadTodos(), notes: loadNotes() })
}

/** Merkt sich den zuletzt gesicherten Stand und den Zeitpunkt. */
export function markSynced(snapshot: string = currentSnapshot()): void {
  localStorage.setItem(SNAPSHOT_KEY, snapshot)
  localStorage.setItem(TIME_KEY, new Date().toISOString())
}

export function lastSyncTime(): string | null {
  return localStorage.getItem(TIME_KEY)
}

/** True, wenn sich der lokale Bestand seit dem letzten Sichern geändert hat. */
export function hasUnsyncedChanges(): boolean {
  return currentSnapshot() !== localStorage.getItem(SNAPSHOT_KEY)
}

// Verhindert, dass manueller und automatischer Sync gleichzeitig schreiben.
let locked = false

export function acquireSyncLock(): boolean {
  if (locked) return false
  locked = true
  return true
}

export function releaseSyncLock(): void {
  locked = false
}

// Nach einem Fehler kurz pausieren, statt im Sekundentakt zu wiederholen.
let backoffUntil = 0

export function inBackoff(): boolean {
  return Date.now() < backoffUntil
}

export function setBackoff(ms: number): void {
  backoffUntil = Date.now() + ms
}

export function clearBackoff(): void {
  backoffUntil = 0
}
