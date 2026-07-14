import { useEffect, useState } from 'react'
import { isoDate } from '../../lib/date'
import { EVENTS_CHANGED, loadEvents, nextEvent, type CalendarEvent } from '../../lib/events'
import {
  fetchWeather,
  getPosition,
  readWeatherCache,
  weatherIcon,
  writeWeatherCache,
  type Weather,
} from '../../lib/weather'
import WeatherIcon from './WeatherIcon'

export default function TopBar() {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      <WeatherCard />
      <ReminderCard />
    </div>
  )
}

function WeatherCard() {
  const [weather, setWeather] = useState<Weather | null>(() => readWeatherCache())
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (readWeatherCache()) return // frischer Cache reicht, kein neuer Standort-Abruf
    setStatus('loading')
    ;(async () => {
      try {
        const { latitude, longitude } = await getPosition()
        const data = await fetchWeather(latitude, longitude)
        if (cancelled) return
        writeWeatherCache(data)
        setWeather(data)
        setStatus('idle')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Wetter konnte nicht geladen werden.')
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
      <WeatherIcon
        kind={weather ? weatherIcon(weather.code) : 'cloudy'}
        className={'h-9 w-9 shrink-0 ' + (weather ? 'text-ink' : 'text-muted')}
      />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted">Heute</p>
        {weather ? (
          <p className="truncate text-sm text-ink">
            <span className="font-semibold text-gold">{weather.temperature}°C</span> ·{' '}
            {weather.description}
          </p>
        ) : status === 'loading' ? (
          <p className="text-sm text-muted">Wetter wird geladen …</p>
        ) : status === 'error' ? (
          <p className="truncate text-sm text-muted" title={error ?? undefined}>
            Wetter nicht verfügbar
          </p>
        ) : (
          <p className="text-sm text-muted">Wetter</p>
        )}
      </div>
    </div>
  )
}

function ReminderCard() {
  const [event, setEvent] = useState<CalendarEvent | null>(() =>
    nextEvent(loadEvents(), isoDate(new Date())),
  )

  useEffect(() => {
    const update = () => setEvent(nextEvent(loadEvents(), isoDate(new Date())))
    update()
    window.addEventListener(EVENTS_CHANGED, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(EVENTS_CHANGED, update)
      window.removeEventListener('storage', update)
    }
  }, [])

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
      <span className="text-2xl" aria-hidden>
        🔔
      </span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted">Nächster Termin</p>
        {event ? (
          <p className="truncate text-sm text-ink">
            <span className="font-semibold text-gold">{reminderWhen(event)}</span> · {event.title}
          </p>
        ) : (
          <p className="text-sm text-muted">Nichts geplant</p>
        )}
      </div>
    </div>
  )
}

/** Baut das "Wann" der Erinnerung: Heute/Morgen bzw. Wochentag + Datum, plus Uhrzeit. */
function reminderWhen(event: CalendarEvent): string {
  const today = new Date()
  const todayIso = isoDate(today)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowIso = isoDate(tomorrow)

  let day: string
  if (event.date === todayIso) {
    day = 'Heute'
  } else if (event.date === tomorrowIso) {
    day = 'Morgen'
  } else {
    day = new Date(event.date + 'T00:00').toLocaleDateString('de-DE', {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
    })
  }
  return event.time ? `${day}, ${event.time} Uhr` : day
}
