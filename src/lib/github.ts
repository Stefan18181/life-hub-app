import type { CalendarEvent } from './events'
import type { Note } from './notes'

export interface SyncConfig {
  /** GitHub Personal Access Token (Contents: Read/Write) */
  token: string
  /** "besitzer/repository" */
  repo: string
  branch: string
}

const CONFIG_KEY = 'life-hub.sync.v1'
const API = 'https://api.github.com'
const EVENTS_PATH = 'calendar/events.json'
const NOTES_DIR = 'notes'

export function loadSyncConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return null
    const cfg = JSON.parse(raw) as SyncConfig
    if (!cfg.token || !cfg.repo) return null
    return { ...cfg, branch: cfg.branch || 'main' }
  } catch {
    return null
  }
}

export function saveSyncConfig(cfg: SyncConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
}

export function clearSyncConfig(): void {
  localStorage.removeItem(CONFIG_KEY)
}

/** UTF-8-sicheres Base64 (btoa allein kann kein Unicode). */
export function encodeContent(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  }
  return btoa(binary)
}

export function decodeContent(b64: string): string {
  const binary = atob(b64.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** Macht aus einem Notiz-Titel einen sicheren Dateinamen. */
export function noteFileName(title: string): string {
  const safe = title
    .replace(/[/\\:*?"<>|#^[\]]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return `${safe || 'Ohne Titel'}.md`
}

/**
 * Ordnet jeder Notiz einen eindeutigen Dateinamen zu
 * (bei Titel-Dubletten wird " 2", " 3", … angehängt).
 */
export function notesToFiles(notes: Note[]): Map<string, string> {
  const files = new Map<string, string>()
  for (const note of notes) {
    const base = noteFileName(note.title)
    let name = base
    let counter = 2
    while (files.has(name)) {
      name = base.replace(/\.md$/, ` ${counter}.md`)
      counter++
    }
    files.set(name, note.content)
  }
  return files
}

class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

export function describeSyncError(err: unknown): string {
  if (err instanceof GitHubError) {
    if (err.status === 401) return 'GitHub hat den Token abgelehnt — bitte prüfen.'
    if (err.status === 404)
      return 'Repository nicht gefunden — stimmen "besitzer/repo" und die Token-Berechtigung (Contents)?'
    if (err.status === 403) return 'Zugriff verweigert oder Rate-Limit erreicht.'
    return `GitHub-Fehler (${err.status}): ${err.message}`
  }
  if (err instanceof TypeError) return 'Keine Verbindung zu GitHub. Bist du online?'
  return 'Unerwarteter Fehler beim Sync.'
}

async function ghFetch(cfg: SyncConfig, path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API}/repos/${cfg.repo}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...init?.headers,
    },
  })
  if (!res.ok && res.status !== 404) {
    throw new GitHubError(await res.text().catch(() => res.statusText), res.status)
  }
  return res
}

interface RemoteFile {
  content: string
  sha: string
}

async function getFile(cfg: SyncConfig, path: string): Promise<RemoteFile | null> {
  const res = await ghFetch(cfg, `contents/${path}?ref=${encodeURIComponent(cfg.branch)}`)
  if (res.status === 404) return null
  const data = (await res.json()) as { content: string; sha: string }
  return { content: decodeContent(data.content), sha: data.sha }
}

async function putFile(
  cfg: SyncConfig,
  path: string,
  content: string,
  message: string,
  sha?: string,
): Promise<void> {
  const res = await ghFetch(cfg, `contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      branch: cfg.branch,
      content: encodeContent(content),
      ...(sha ? { sha } : {}),
    }),
  })
  if (res.status === 404) throw new GitHubError('Repository oder Branch nicht gefunden', 404)
}

async function deleteFile(
  cfg: SyncConfig,
  path: string,
  sha: string,
  message: string,
): Promise<void> {
  await ghFetch(cfg, `contents/${path}`, {
    method: 'DELETE',
    body: JSON.stringify({ message, branch: cfg.branch, sha }),
  })
}

async function listDir(
  cfg: SyncConfig,
  path: string,
): Promise<{ name: string; path: string; sha: string }[]> {
  const res = await ghFetch(cfg, `contents/${path}?ref=${encodeURIComponent(cfg.branch)}`)
  if (res.status === 404) return []
  const data = (await res.json()) as { name: string; path: string; sha: string; type: string }[]
  return data.filter((e) => e.type === 'file')
}

/** Lädt Termine und Notizen ins Repo hoch (lokal → GitHub). */
export async function uploadAll(
  cfg: SyncConfig,
  events: CalendarEvent[],
  notes: Note[],
  log: (line: string) => void,
): Promise<void> {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const message = `Life Hub Sync ${stamp}`

  const existing = await getFile(cfg, EVENTS_PATH)
  await putFile(cfg, EVENTS_PATH, JSON.stringify(events, null, 2) + '\n', message, existing?.sha)
  log(`✓ ${events.length} Termine → ${EVENTS_PATH}`)

  const remote = await listDir(cfg, NOTES_DIR)
  const remoteByName = new Map(remote.map((f) => [f.name, f]))
  const files = notesToFiles(notes)

  for (const [name, content] of files) {
    await putFile(cfg, `${NOTES_DIR}/${name}`, content, message, remoteByName.get(name)?.sha)
    log(`✓ Notiz → ${NOTES_DIR}/${name}`)
  }

  for (const file of remote) {
    if (!files.has(file.name) && file.name.endsWith('.md')) {
      await deleteFile(cfg, file.path, file.sha, message)
      log(`✗ entfernt: ${file.path}`)
    }
  }
}

/** Lädt Termine und Notizen aus dem Repo (GitHub → lokal). */
export async function downloadAll(
  cfg: SyncConfig,
  log: (line: string) => void,
): Promise<{ events: CalendarEvent[]; notes: Note[] }> {
  const eventsFile = await getFile(cfg, EVENTS_PATH)
  let events: CalendarEvent[] = []
  if (eventsFile) {
    const parsed: unknown = JSON.parse(eventsFile.content)
    if (Array.isArray(parsed)) {
      events = parsed.filter(
        (e): e is CalendarEvent =>
          typeof e === 'object' &&
          e !== null &&
          typeof (e as CalendarEvent).date === 'string' &&
          typeof (e as CalendarEvent).title === 'string',
      )
    }
    log(`✓ ${events.length} Termine geladen`)
  } else {
    log(`– ${EVENTS_PATH} existiert noch nicht`)
  }

  const notes: Note[] = []
  const remote = await listDir(cfg, NOTES_DIR)
  for (const file of remote) {
    if (!file.name.endsWith('.md')) continue
    const remoteFile = await getFile(cfg, file.path)
    if (!remoteFile) continue
    notes.push({
      id: crypto.randomUUID(),
      title: file.name.replace(/\.md$/, ''),
      content: remoteFile.content,
      updatedAt: new Date().toISOString(),
    })
    log(`✓ Notiz geladen: ${file.name}`)
  }

  return { events, notes }
}
