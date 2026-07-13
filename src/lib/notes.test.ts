import { beforeEach, describe, expect, it } from 'vitest'
import {
  addNote,
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
