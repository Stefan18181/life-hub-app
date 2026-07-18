export interface Note {
  id: string
  title: string
  /** Markdown-Inhalt (Obsidian-kompatibel, inkl. [[Wikilinks]]) */
  content: string
  /** ISO-Zeitstempel der letzten Änderung */
  updatedAt: string
}

const STORAGE_KEY = 'life-hub.notes.v1'

export function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (n): n is Note =>
        typeof n === 'object' &&
        n !== null &&
        typeof (n as Note).id === 'string' &&
        typeof (n as Note).title === 'string' &&
        typeof (n as Note).content === 'string' &&
        typeof (n as Note).updatedAt === 'string',
    )
  } catch {
    return []
  }
}

export function saveNotes(notes: Note[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

export function addNote(notes: Note[], title: string): Note[] {
  const note: Note = {
    id: crypto.randomUUID(),
    title,
    content: '',
    updatedAt: new Date().toISOString(),
  }
  return sortNotes([...notes, note])
}

export function updateNote(
  notes: Note[],
  id: string,
  patch: Partial<Pick<Note, 'title' | 'content'>>,
): Note[] {
  return sortNotes(
    notes.map((n) =>
      n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
    ),
  )
}

export function removeNote(notes: Note[], id: string): Note[] {
  return notes.filter((n) => n.id !== id)
}

/** Findet eine Notiz per Titel (Groß-/Kleinschreibung egal), z. B. für Wikilinks. */
export function findByTitle(notes: Note[], title: string): Note | undefined {
  const needle = title.trim().toLowerCase()
  return notes.find((n) => n.title.trim().toLowerCase() === needle)
}

/** Extrahiert alle [[Wikilink]]-Ziele aus einem Markdown-Text. */
export function extractWikiLinks(content: string): string[] {
  const targets = new Set<string>()
  for (const match of content.matchAll(/\[\[([^\][\n]+)\]\]/g)) {
    const target = match[1].trim()
    if (target) targets.add(target)
  }
  return [...targets]
}

/**
 * Extrahiert #tags aus einem Markdown-Text (klein geschrieben, ohne Duplikate).
 * Ein Tag beginnt am Zeilenanfang oder nach Leerraum mit `#` und einem Buchstaben;
 * so werden Markdown-Überschriften („# Titel") nicht als Tags erkannt.
 */
export function extractTags(content: string): string[] {
  const tags = new Set<string>()
  for (const match of content.matchAll(/(?:^|\s)#([\p{L}][\p{L}\p{N}_/-]*)/gu)) {
    tags.add(match[1].toLowerCase())
  }
  return [...tags]
}

/** Alle über die Notizen vergebenen Tags, alphabetisch sortiert. */
export function allTags(notes: Note[]): string[] {
  const set = new Set<string>()
  for (const n of notes) for (const t of extractTags(n.content)) set.add(t)
  return [...set].sort((a, b) => a.localeCompare(b, 'de'))
}

/**
 * Notizen, die per [[Wikilink]] auf die Zielnotiz verweisen
 * (Vergleich über den Titel, ohne Selbstbezug).
 */
export function backlinks(notes: Note[], target: Note): Note[] {
  const title = target.title.trim().toLowerCase()
  if (!title) return []
  return notes.filter(
    (n) =>
      n.id !== target.id &&
      extractWikiLinks(n.content).some((link) => link.trim().toLowerCase() === title),
  )
}

function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
