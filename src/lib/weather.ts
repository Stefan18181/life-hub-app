export interface Weather {
  /** Temperatur in °C, gerundet. */
  temperature: number
  /** WMO-Wettercode. */
  code: number
  /** Deutsche Kurzbeschreibung, z. B. "Teils bewölkt". */
  description: string
  /** Passendes Emoji zum Wetter. */
  emoji: string
}

/**
 * WMO-Wettercodes (Open-Meteo) auf deutsche Beschreibung + Emoji.
 * https://open-meteo.com/en/docs → "Weather variable documentation"
 */
const WMO: Record<number, { description: string; emoji: string }> = {
  0: { description: 'Klar', emoji: '☀️' },
  1: { description: 'Überwiegend klar', emoji: '🌤️' },
  2: { description: 'Teils bewölkt', emoji: '⛅' },
  3: { description: 'Bewölkt', emoji: '☁️' },
  45: { description: 'Nebel', emoji: '🌫️' },
  48: { description: 'Reifnebel', emoji: '🌫️' },
  51: { description: 'Leichter Nieselregen', emoji: '🌦️' },
  53: { description: 'Nieselregen', emoji: '🌦️' },
  55: { description: 'Starker Nieselregen', emoji: '🌦️' },
  56: { description: 'Gefrierender Nieselregen', emoji: '🌧️' },
  57: { description: 'Gefrierender Nieselregen', emoji: '🌧️' },
  61: { description: 'Leichter Regen', emoji: '🌧️' },
  63: { description: 'Regen', emoji: '🌧️' },
  65: { description: 'Starker Regen', emoji: '🌧️' },
  66: { description: 'Gefrierender Regen', emoji: '🌧️' },
  67: { description: 'Gefrierender Regen', emoji: '🌧️' },
  71: { description: 'Leichter Schneefall', emoji: '🌨️' },
  73: { description: 'Schneefall', emoji: '🌨️' },
  75: { description: 'Starker Schneefall', emoji: '🌨️' },
  77: { description: 'Schneegriesel', emoji: '🌨️' },
  80: { description: 'Leichte Regenschauer', emoji: '🌦️' },
  81: { description: 'Regenschauer', emoji: '🌦️' },
  82: { description: 'Heftige Regenschauer', emoji: '⛈️' },
  85: { description: 'Schneeschauer', emoji: '🌨️' },
  86: { description: 'Starke Schneeschauer', emoji: '🌨️' },
  95: { description: 'Gewitter', emoji: '⛈️' },
  96: { description: 'Gewitter mit Hagel', emoji: '⛈️' },
  99: { description: 'Gewitter mit Hagel', emoji: '⛈️' },
}

export function describeWeatherCode(code: number): { description: string; emoji: string } {
  return WMO[code] ?? { description: 'Unbekannt', emoji: '🌡️' }
}

/** Ermittelt die aktuelle Position über die Geolocation-API des Browsers. */
export function getPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Standort wird von diesem Browser nicht unterstützt.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(new Error(err.message || 'Standort nicht verfügbar.')),
      { timeout: 10_000, maximumAge: 30 * 60 * 1000 },
    )
  })
}

/** Holt das aktuelle Wetter von Open-Meteo (kein API-Key nötig). */
export async function fetchWeather(latitude: number, longitude: number): Promise<Weather> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${latitude}&longitude=${longitude}` +
    '&current=temperature_2m,weather_code&timezone=auto'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Wetterdienst nicht erreichbar (${res.status}).`)
  const data = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number }
  }
  const temp = data.current?.temperature_2m
  const code = data.current?.weather_code
  if (typeof temp !== 'number' || typeof code !== 'number') {
    throw new Error('Unerwartete Antwort vom Wetterdienst.')
  }
  return { temperature: Math.round(temp), code, ...describeWeatherCode(code) }
}

const CACHE_KEY = 'life-hub.weather.v1'
const MAX_AGE_MS = 30 * 60 * 1000

interface WeatherCache {
  data: Weather
  ts: number
}

export function readWeatherCache(): Weather | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cache = JSON.parse(raw) as WeatherCache
    if (Date.now() - cache.ts > MAX_AGE_MS) return null
    return cache.data
  } catch {
    return null
  }
}

export function writeWeatherCache(data: Weather): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() } satisfies WeatherCache))
}
