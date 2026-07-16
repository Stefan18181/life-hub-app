import { beforeEach, describe, expect, it } from 'vitest'
import {
  categoryName,
  defaultCategoryNames,
  loadCategoryNames,
  saveCategoryNames,
} from './categories'

describe('categories', () => {
  beforeEach(() => localStorage.clear())

  it('liefert die Standardnamen ohne gespeicherte Daten', () => {
    expect(loadCategoryNames().gold).toBe('Gold')
    expect(loadCategoryNames().blue).toBe('Blau')
  })

  it('überschreibt einzelne Namen und behält den Rest als Standard', () => {
    saveCategoryNames({ ...defaultCategoryNames(), blue: 'Arbeit' })
    const names = loadCategoryNames()
    expect(names.blue).toBe('Arbeit')
    expect(names.green).toBe('Grün')
  })

  it('categoryName fällt bei fehlendem Schlüssel auf Gold zurück', () => {
    const names = loadCategoryNames()
    expect(categoryName(names, 'blue')).toBe('Blau')
    expect(categoryName(names, undefined)).toBe('Gold')
  })

  it('ignoriert kaputte gespeicherte Daten', () => {
    localStorage.setItem('life-hub.categories.v1', 'kein json')
    expect(loadCategoryNames().gold).toBe('Gold')
  })
})
