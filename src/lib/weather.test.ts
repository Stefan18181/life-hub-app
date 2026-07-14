import { describe, expect, it } from 'vitest'
import { describeWeatherCode } from './weather'

describe('describeWeatherCode', () => {
  it('ordnet bekannte WMO-Codes zu', () => {
    expect(describeWeatherCode(0).description).toBe('Klar')
    expect(describeWeatherCode(3).description).toBe('Bewölkt')
    expect(describeWeatherCode(95).emoji).toBe('⛈️')
  })

  it('hat einen Fallback für unbekannte Codes', () => {
    expect(describeWeatherCode(999)).toEqual({ description: 'Unbekannt', emoji: '🌡️' })
  })
})
