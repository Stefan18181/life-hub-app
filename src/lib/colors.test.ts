import { describe, expect, it } from 'vitest'
import { EVENT_COLORS, eventColorHex } from './colors'

describe('eventColorHex', () => {
  it('liefert den Hex-Wert zu einem bekannten Schlüssel', () => {
    expect(eventColorHex('blue')).toBe('#6ea8fe')
    expect(eventColorHex('green')).toBe('#6cc38a')
  })

  it('fällt bei fehlendem oder unbekanntem Schlüssel auf Gold zurück', () => {
    const gold = EVENT_COLORS.find((c) => c.key === 'gold')!.hex
    expect(eventColorHex(undefined)).toBe(gold)
    expect(eventColorHex('gibtsnicht')).toBe(gold)
  })
})
