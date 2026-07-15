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

/** Die 7 Tage (Mo–So) der Woche, die `date` enthält. */
export function weekGrid(date: Date): Date[] {
  const offset = (date.getDay() + 6) % 7 // Tage seit Montag
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset)
  return Array.from(
    { length: 7 },
    (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i),
  )
}

/** Label der Woche, z. B. "13.–19. Juli 2026" (kompakt) oder monatsübergreifend. */
export function weekLabel(date: Date): string {
  const days = weekGrid(date)
  const first = days[0]
  const last = days[6]
  const sameMonth = first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()
  if (sameMonth) {
    const month = first.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    return `${first.getDate()}.–${last.getDate()}. ${month}`
  }
  const sameYear = first.getFullYear() === last.getFullYear()
  const f = first.toLocaleDateString('de-DE', sameYear ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' })
  const l = last.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${f} – ${l}`
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
