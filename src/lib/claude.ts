import Anthropic from '@anthropic-ai/sdk'
import { isoDate } from './date'
import type { CalendarEvent } from './events'
import type { Note } from './notes'

const KEY_STORAGE = 'life-hub.claude-key.v1'

export const CLAUDE_MODEL = 'claude-opus-4-8'

export function loadApiKey(): string | null {
  return localStorage.getItem(KEY_STORAGE)
}

export function saveApiKey(key: string): void {
  localStorage.setItem(KEY_STORAGE, key)
}

export function clearApiKey(): void {
  localStorage.removeItem(KEY_STORAGE)
}

/**
 * Der Key bleibt im Browser (localStorage) und geht nur an die Anthropic API.
 * dangerouslyAllowBrowser ist hier bewusst gesetzt: Life Hub ist eine lokale
 * Einzelnutzer-PWA mit dem eigenen Key des Nutzers, kein geteilter Server-Key.
 */
export function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

/**
 * Baut den System-Prompt inklusive Kontext aus Kalender und Notizen,
 * damit Claude Fragen wie "Was steht diese Woche an?" beantworten kann.
 */
export function buildSystemPrompt(
  events: CalendarEvent[],
  notes: Note[],
  today: Date,
): string {
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + 14)
  const from = isoDate(today)
  const to = isoDate(horizon)

  const upcoming = events.filter((e) => e.date >= from && e.date <= to)
  const eventLines =
    upcoming.length === 0
      ? '(keine Termine in den nächsten 14 Tagen)'
      : upcoming
          .map((e) => `- ${e.date}${e.time ? ` ${e.time} Uhr` : ''}: ${e.title}`)
          .join('\n')

  const noteLines =
    notes.length === 0
      ? '(keine Notizen vorhanden)'
      : notes.map((n) => `- ${n.title || 'Ohne Titel'}`).join('\n')

  const todayLabel = today.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return `Du bist der persönliche Assistent in "Life Hub", einer privaten Organisations-App. Antworte auf Deutsch, freundlich und prägnant.

Heute ist ${todayLabel}.

Termine des Nutzers (nächste 14 Tage):
${eventLines}

Titel der Notizen des Nutzers:
${noteLines}

Beziehe dich auf diese Daten, wenn der Nutzer nach Terminen oder Notizen fragt. Inhalte der Notizen kennst du nicht, nur die Titel.`
}
