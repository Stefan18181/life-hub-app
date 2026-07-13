import { describe, expect, it } from 'vitest'
import { decodeContent, encodeContent, noteFileName, notesToFiles } from './github'
import type { Note } from './notes'

function note(title: string, content = ''): Note {
  return { id: crypto.randomUUID(), title, content, updatedAt: '2026-07-13T10:00:00Z' }
}

describe('encodeContent / decodeContent', () => {
  it('übersteht Unicode-Roundtrips', () => {
    const text = '# Überschrift\n\nÄpfel, Öl, größer — und Emoji: 🎉'
    expect(decodeContent(encodeContent(text))).toBe(text)
  })

  it('verkraftet Zeilenumbrüche im Base64 (GitHub-Format)', () => {
    const b64 = encodeContent('Hallo Welt')
    const withNewlines = b64.match(/.{1,10}/g)!.join('\n')
    expect(decodeContent(withNewlines)).toBe('Hallo Welt')
  })
})

describe('noteFileName', () => {
  it('ersetzt gefährliche Zeichen', () => {
    expect(noteFileName('Projekt: A/B?')).toBe('Projekt- A-B-.md')
  })

  it('fängt leere Titel ab', () => {
    expect(noteFileName('   ')).toBe('Ohne Titel.md')
  })
})

describe('notesToFiles', () => {
  it('macht doppelte Titel eindeutig', () => {
    const files = notesToFiles([note('Plan', 'eins'), note('Plan', 'zwei'), note('Plan', 'drei')])
    expect([...files.keys()]).toEqual(['Plan.md', 'Plan 2.md', 'Plan 3.md'])
    expect(files.get('Plan 2.md')).toBe('zwei')
  })
})
