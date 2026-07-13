import { describe, expect, it } from 'vitest'
import { isoDate, monthGrid, sameDay } from './date'

describe('isoDate', () => {
  it('formatiert mit führenden Nullen', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(isoDate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('monthGrid', () => {
  it('liefert immer 42 Zellen', () => {
    expect(monthGrid(2026, 6)).toHaveLength(42)
  })

  it('beginnt am Montag vor dem Monatsersten', () => {
    // Juli 2026 beginnt an einem Mittwoch → Grid startet Montag, 29. Juni
    const cells = monthGrid(2026, 6)
    expect(isoDate(cells[0])).toBe('2026-06-29')
    expect(cells[0].getDay()).toBe(1)
  })

  it('startet direkt am Monatsersten, wenn dieser ein Montag ist', () => {
    // Juni 2026 beginnt an einem Montag
    const cells = monthGrid(2026, 5)
    expect(isoDate(cells[0])).toBe('2026-06-01')
  })
})

describe('sameDay', () => {
  it('vergleicht nur das Datum, nicht die Uhrzeit', () => {
    expect(sameDay(new Date(2026, 6, 13, 8), new Date(2026, 6, 13, 22))).toBe(true)
    expect(sameDay(new Date(2026, 6, 13), new Date(2026, 6, 14))).toBe(false)
  })
})
