import { beforeEach, describe, expect, it } from 'vitest'
import {
  addNote,
  allTags,
  backlinks,
  extractTags,
  extractWikiLinks,
  findByTitle,
  loadNotes,
  removeNote,
  saveNotes,
  updateNote,
  type Note,
} from './notes'

describe('addNote / updateNote / removeNote', () => {
  it('legt Notizen an und sortiert nach letzter Änderung', () => {
    let notes: Note[] = []
    notes = addNote(notes, 'Erste')
    notes = addNote(notes, 'Zweite')
    const first = notes.find((n) => n.title === 'Erste')!

    notes = updateNote(notes, first.id, { content: 'Hallo' })
    expect(notes[0].title).toBe('Erste')
    expect(notes[0].content).toBe('Hallo')

    notes = removeNote(notes, first.id)
    expect(notes.map((n) => n.title)).toEqual(['Zweite'])
  })
})

describe('findByTitle', () => {
  it('ignoriert Groß-/Kleinschreibung und Leerraum', () => {
    const notes = addNote([], 'Einkaufsliste')
    expect(findByTitle(notes, '  einkaufsliste ')).toBeDefined()
    expect(findByTitle(notes, 'Unbekannt')).toBeUndefined()
  })
})

describe('extractWikiLinks', () => {
  it('findet alle Wikilink-Ziele ohne Duplikate', () => {
    const content = 'Siehe [[Projekt A]] und [[Projekt B]], nochmal [[Projekt A]].'
    expect(extractWikiLinks(content)).toEqual(['Projekt A', 'Projekt B'])
  })

  it('ignoriert leere und mehrzeilige Klammern', () => {
    expect(extractWikiLinks('[[  ]] und [[a\nb]]')).toEqual([])
  })
})

describe('backlinks', () => {
  function note(id: string, title: string, content: string): Note {
    return { id, title, content, updatedAt: '2026-07-01T00:00:00Z' }
  }

  it('findet Notizen, die per Wikilink auf die Zielnotiz zeigen', () => {
    const target = note('t', 'Projekt A', '')
    const notes = [
      target,
      note('b', 'Meeting', 'Besprechung zu [[projekt a]] heute.'),
      note('c', 'Ideen', 'Nichts Verwandtes.'),
      note('d', 'Notiz', 'Verweist auf [[Projekt A]] und [[Projekt B]].'),
    ]
    expect(backlinks(notes, target).map((n) => n.id).sort()).toEqual(['b', 'd'])
  })

  it('verweist nicht auf sich selbst und ignoriert leere Titel', () => {
    const self = note('s', 'Tagebuch', 'Siehe [[Tagebuch]].')
    expect(backlinks([self], self)).toEqual([])
    const empty = note('e', '   ', 'egal')
    expect(backlinks([empty, note('x', 'X', '[[ ]]')], empty)).toEqual([])
  })
})

describe('extractTags / allTags', () => {
  it('findet #tags klein geschrieben ohne Duplikate', () => {
    expect(extractTags('Zu #Arbeit und #privat, nochmal #arbeit.')).toEqual(['arbeit', 'privat'])
  })

  it('ignoriert Markdown-Überschriften und Tags mitten im Wort', () => {
    expect(extractTags('# Überschrift\n## Zweite\nfoo#bar test')).toEqual([])
    expect(extractTags('Start #ziel am Zeilenanfang')).toEqual(['ziel'])
  })

  it('erlaubt Umlaute, Ziffern und Schrägstriche im Tag', () => {
    expect(extractTags('#gesundheit/sport und #woche42')).toEqual(['gesundheit/sport', 'woche42'])
  })

  it('allTags sammelt und sortiert über alle Notizen', () => {
    const notes: Note[] = [
      { id: 'a', title: 'A', content: '#zebra #anfang', updatedAt: '2026-07-01T00:00:00Z' },
      { id: 'b', title: 'B', content: '#mitte #anfang', updatedAt: '2026-07-01T00:00:00Z' },
    ]
    expect(allTags(notes)).toEqual(['anfang', 'mitte', 'zebra'])
  })
})

describe('loadNotes / saveNotes', () => {
  beforeEach(() => localStorage.clear())

  it('lädt gespeicherte Notizen zurück', () => {
    const notes = addNote([], 'Test')
    saveNotes(notes)
    expect(loadNotes()).toEqual(notes)
  })

  it('ignoriert kaputte Daten', () => {
    localStorage.setItem('life-hub.notes.v1', '{kein json')
    expect(loadNotes()).toEqual([])
  })
})
