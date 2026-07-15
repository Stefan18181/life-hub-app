import { useEffect } from 'react'
import {
  acquireSyncLock,
  currentSnapshot,
  hasUnsyncedChanges,
  inBackoff,
  markSynced,
  releaseSyncLock,
  setBackoff,
} from '../../lib/autosync'
import { loadEvents } from '../../lib/events'
import { loadSyncConfig, uploadAll } from '../../lib/github'
import { loadNotes } from '../../lib/notes'
import { loadTodos } from '../../lib/todos'

/** Wird nach einem erfolgreichen Auto-Backup ausgelöst, damit der Sync-Tab die Zeit aktualisiert. */
export const AUTO_SYNC_EVENT = 'life-hub:autosync'

const INTERVAL_MS = 15_000
const ERROR_BACKOFF_MS = 5 * 60 * 1000

/**
 * App-weites automatisches Sichern (nur Upload). Prüft regelmäßig und beim
 * Verstecken des Tabs, ob sich lokal etwas geändert hat, und lädt dann hoch.
 * Lädt nie automatisch herunter — das bleibt manuell, um lokale Daten zu schützen.
 */
export function useAutoBackup(): void {
  useEffect(() => {
    let cancelled = false

    async function run() {
      const cfg = loadSyncConfig()
      if (!cfg?.auto || inBackoff() || !hasUnsyncedChanges()) return
      if (!acquireSyncLock()) return
      const snapshot = currentSnapshot()
      try {
        await uploadAll(cfg, loadEvents(), loadNotes(), loadTodos(), () => {})
        if (!cancelled) {
          markSynced(snapshot)
          window.dispatchEvent(new CustomEvent(AUTO_SYNC_EVENT))
        }
      } catch {
        // Fehler (z. B. Token abgelaufen) kurz aussitzen; beim manuellen Sync wird er sichtbar.
        setBackoff(ERROR_BACKOFF_MS)
      } finally {
        releaseSyncLock()
      }
    }

    const id = window.setInterval(run, INTERVAL_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void run()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}
