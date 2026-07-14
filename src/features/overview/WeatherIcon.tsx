import type { WeatherIconKind } from '../../lib/weather'

const GOLD = '#d4b477'

/**
 * Zweifarbige Strich-Icons fürs Wetter: Sonne/Blitz in Gold,
 * Wolken/Niederschlag in der aktuellen Textfarbe (currentColor).
 */
export default function WeatherIcon(props: { kind: WeatherIconKind; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={props.className}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {render(props.kind)}
    </svg>
  )
}

const CLOUD = 'M7 18h9.2a3.4 3.4 0 0 0 .3-6.79 5.4 5.4 0 0 0-10.4-1.2A3.9 3.9 0 0 0 7 18Z'

function Sun(props: { cx: number; cy: number; r: number; rays?: boolean }) {
  const { cx, cy, r, rays = true } = props
  const rayLines = rays
    ? [
        [cx, cy - r - 2.6, cx, cy - r - 0.6],
        [cx, cy + r + 0.6, cx, cy + r + 2.6],
        [cx - r - 2.6, cy, cx - r - 0.6, cy],
        [cx + r + 0.6, cy, cx + r + 2.6, cy],
        [cx - r - 1.9, cy - r - 1.9, cx - r - 0.5, cy - r - 0.5],
        [cx + r + 0.5, cy + r + 0.5, cx + r + 1.9, cy + r + 1.9],
        [cx + r + 0.5, cy - r - 0.5, cx + r + 1.9, cy - r - 1.9],
        [cx - r - 1.9, cy + r + 1.9, cx - r - 0.5, cy + r + 0.5],
      ]
    : []
  return (
    <>
      <circle cx={cx} cy={cy} r={r} stroke={GOLD} />
      {rayLines.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} />
      ))}
    </>
  )
}

function drops(kind: 'rain' | 'drizzle' | 'snow') {
  const xs = [8.5, 12, 15.5]
  if (kind === 'snow') {
    return xs.map((x, i) => <circle key={i} cx={x} cy={21} r={0.9} fill="currentColor" stroke="none" />)
  }
  const len = kind === 'rain' ? 2.6 : 1.4
  return xs.map((x, i) => <line key={i} x1={x} y1={19.6} x2={x - 1} y2={19.6 + len} />)
}

function render(kind: WeatherIconKind) {
  switch (kind) {
    case 'clear':
      return <Sun cx={12} cy={12} r={4.4} />
    case 'partly':
      return (
        <>
          <Sun cx={9} cy={8.5} r={3} />
          <path d={CLOUD} />
        </>
      )
    case 'cloudy':
      return <path d={CLOUD} />
    case 'fog':
      return (
        <>
          <path d={CLOUD} />
          <line x1={6} y1={20.5} x2={16} y2={20.5} />
          <line x1={8} y1={22.5} x2={18} y2={22.5} />
        </>
      )
    case 'drizzle':
      return (
        <>
          <path d={CLOUD} />
          {drops('drizzle')}
        </>
      )
    case 'rain':
      return (
        <>
          <path d={CLOUD} />
          {drops('rain')}
        </>
      )
    case 'snow':
      return (
        <>
          <path d={CLOUD} />
          {drops('snow')}
        </>
      )
    case 'thunder':
      return (
        <>
          <path d={CLOUD} />
          <path d="M12.5 18.5 10.5 22h2l-1 2.5" stroke={GOLD} />
        </>
      )
  }
}
