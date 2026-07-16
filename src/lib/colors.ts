/** Auswählbare Farb-Markierungen für Termine (Schlüssel + Anzeige). */
export const EVENT_COLORS: { key: string; label: string; hex: string }[] = [
  { key: 'gold', label: 'Gold', hex: '#d4b477' },
  { key: 'blue', label: 'Blau', hex: '#6ea8fe' },
  { key: 'green', label: 'Grün', hex: '#6cc38a' },
  { key: 'red', label: 'Rot', hex: '#e07a7a' },
  { key: 'purple', label: 'Violett', hex: '#b58ad6' },
]

const DEFAULT_HEX = '#d4b477'

/** Hex-Wert zu einem Farb-Schlüssel; Fallback ist Gold. */
export function eventColorHex(key?: string): string {
  if (!key) return DEFAULT_HEX
  return EVENT_COLORS.find((c) => c.key === key)?.hex ?? DEFAULT_HEX
}
