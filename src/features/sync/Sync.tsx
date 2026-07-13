import { useState } from 'react'
import { loadEvents, saveEvents } from '../../lib/events'
import {
  clearSyncConfig,
  describeSyncError,
  downloadAll,
  loadSyncConfig,
  saveSyncConfig,
  uploadAll,
  type SyncConfig,
} from '../../lib/github'
import { loadNotes, saveNotes } from '../../lib/notes'

export default function Sync() {
  const [config, setConfig] = useState<SyncConfig | null>(() => loadSyncConfig())

  if (!config) {
    return <SetupForm onSave={setConfig} />
  }
  return (
    <SyncPanel
      config={config}
      onReset={() => {
        clearSyncConfig()
        setConfig(null)
      }}
    />
  )
}

function SetupForm(props: { onSave: (cfg: SyncConfig) => void }) {
  const [token, setToken] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('main')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const cfg: SyncConfig = {
      token: token.trim(),
      repo: repo.trim(),
      branch: branch.trim() || 'main',
    }
    if (!cfg.token || !/^[^/\s]+\/[^/\s]+$/.test(cfg.repo)) return
    saveSyncConfig(cfg)
    props.onSave(cfg)
  }

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-line bg-card p-6">
      <h2 className="mb-2 font-serif text-xl text-gold">Git-Sync einrichten</h2>
      <p className="mb-4 text-sm text-muted">
        Deine Notizen werden als Markdown-Dateien (Obsidian-kompatibel) und deine
        Termine als JSON in ein GitHub-Repository gesichert. Du brauchst ein
        Repository und einen Fine-grained Personal Access Token mit der
        Berechtigung „Contents: Read and write". Token und Einstellungen bleiben
        lokal in deinem Browser.
      </p>
      <form onSubmit={submit} className="space-y-2">
        <input
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="besitzer/repository"
          className="w-full rounded-md border border-line bg-night px-3 py-2 text-sm placeholder:text-muted focus:border-gold focus:outline-none"
        />
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="GitHub-Token (github_pat_…)"
          className="w-full rounded-md border border-line bg-night px-3 py-2 text-sm placeholder:text-muted focus:border-gold focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="Branch (main)"
            className="w-40 rounded-md border border-line bg-night px-3 py-2 text-sm placeholder:text-muted focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            className="flex-1 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-night transition-opacity hover:opacity-90"
          >
            Speichern
          </button>
        </div>
      </form>
    </div>
  )
}

function SyncPanel(props: { config: SyncConfig; onReset: () => void }) {
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<string[]>([])

  function appendLog(line: string) {
    setLog((prev) => [...prev, line])
  }

  async function upload() {
    if (busy) return
    setBusy(true)
    setLog([`Lade hoch nach ${props.config.repo} (${props.config.branch}) …`])
    try {
      await uploadAll(props.config, loadEvents(), loadNotes(), appendLog)
      appendLog('Fertig — alles gesichert. ✓')
    } catch (err) {
      appendLog(`Fehler: ${describeSyncError(err)}`)
    } finally {
      setBusy(false)
    }
  }

  async function download() {
    if (busy) return
    const ok = window.confirm(
      'Herunterladen ersetzt deine lokalen Termine und Notizen durch den Stand aus dem Repository. Fortfahren?',
    )
    if (!ok) return
    setBusy(true)
    setLog([`Lade herunter von ${props.config.repo} (${props.config.branch}) …`])
    try {
      const { events, notes } = await downloadAll(props.config, appendLog)
      saveEvents(events)
      saveNotes(notes)
      appendLog('Fertig — lokale Daten aktualisiert. ✓')
    } catch (err) {
      appendLog(`Fehler: ${describeSyncError(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-line bg-card p-6">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl text-gold">Git-Sync</h2>
        <button
          onClick={props.onReset}
          className="rounded-md border border-line px-3 py-1 text-sm text-muted transition-colors hover:border-gold hover:text-gold"
        >
          Einstellungen ändern
        </button>
      </header>

      <p className="mb-4 text-sm text-muted">
        Repository: <span className="text-ink">{props.config.repo}</span> · Branch:{' '}
        <span className="text-ink">{props.config.branch}</span>
      </p>

      <div className="mb-4 flex gap-2">
        <button
          onClick={upload}
          disabled={busy}
          className="flex-1 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-night transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          ↑ Hochladen (lokal → GitHub)
        </button>
        <button
          onClick={download}
          disabled={busy}
          className="flex-1 rounded-md border border-gold px-4 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-gold hover:text-night disabled:opacity-40"
        >
          ↓ Herunterladen (GitHub → lokal)
        </button>
      </div>

      {log.length > 0 && (
        <pre className="max-h-64 overflow-y-auto rounded-md border border-line bg-night p-3 text-xs leading-relaxed text-muted">
          {log.join('\n')}
        </pre>
      )}
    </div>
  )
}
