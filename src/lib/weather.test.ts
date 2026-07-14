import { describe, expect, it } from 'vitest'
import { describeWeatherCode, weatherIcon } from './weather'

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

describe('weatherIcon', () => {
  it('ordnet WMO-Codes den Icon-Kategorien zu', () => {
    expect(weatherIcon(0)).toBe('clear')
    expect(weatherIcon(2)).toBe('partly')
    expect(weatherIcon(3)).toBe('cloudy')
    expect(weatherIcon(48)).toBe('fog')
    expect(weatherIcon(55)).toBe('drizzle')
    expect(weatherIcon(65)).toBe('rain')
    expect(weatherIcon(81)).toBe('rain')
    expect(weatherIcon(73)).toBe('snow')
    expect(weatherIcon(95)).toBe('thunder')
  })
})
