import { describe, expect, it } from 'vitest'
import { isoDate, monthGrid, sameDay, weekGrid, weekLabel } from './date'

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

describe('weekGrid', () => {
  it('liefert Montag bis Sonntag der Woche', () => {
    // Mittwoch, 15. Juli 2026
    const cells = weekGrid(new Date(2026, 6, 15))
    expect(cells).toHaveLength(7)
    expect(isoDate(cells[0])).toBe('2026-07-13') // Montag
    expect(isoDate(cells[6])).toBe('2026-07-19') // Sonntag
    expect(cells[0].getDay()).toBe(1)
  })

  it('behandelt Sonntag als letzten Tag der Woche, nicht als ersten', () => {
    // Sonntag, 19. Juli 2026 → Woche beginnt am 13.
    expect(isoDate(weekGrid(new Date(2026, 6, 19))[0])).toBe('2026-07-13')
  })
})

describe('weekLabel', () => {
  it('fasst Wochen innerhalb eines Monats kompakt zusammen', () => {
    expect(weekLabel(new Date(2026, 6, 15))).toBe('13.–19. Juli 2026')
  })

  it('nennt beide Monate bei monatsübergreifenden Wochen', () => {
    // Woche mit 29. Juni – 5. Juli 2026
    expect(weekLabel(new Date(2026, 5, 30))).toBe('29. Juni – 5. Juli 2026')
  })
})
