export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  })
}

/**
 * 42 Zellen (6 Wochen) für die Monatsansicht, Wochenstart Montag.
 * Enthält auch die angeschnittenen Tage der Nachbarmonate.
 */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(year, month, 1 - offset + i))
  }
  return cells
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
