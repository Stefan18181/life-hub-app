import { useState } from 'react'
import Calendar from './features/calendar/Calendar'
import ClaudeChat from './features/claude/ClaudeChat'
import Notes from './features/notes/Notes'
import Sync from './features/sync/Sync'

const TABS = ['Kalender', 'Notizen', 'Claude', 'Sync'] as const
type Tab = (typeof TABS)[number]

export default function App() {
  const [tab, setTab] = useState<Tab>('Kalender')

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 pb-12">
      <header className="flex items-center justify-between py-6">
        <h1 className="font-serif text-2xl text-gold">Life Hub</h1>
        <nav className="flex gap-1 rounded-lg border border-line bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                'rounded-md px-3 py-1.5 text-sm transition-colors ' +
                (tab === t ? 'bg-gold font-semibold text-night' : 'text-muted hover:text-ink')
              }
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {tab === 'Kalender' && <Calendar />}
        {tab === 'Notizen' && <Notes />}
        {tab === 'Claude' && <ClaudeChat />}
        {tab === 'Sync' && <Sync />}
      </main>
    </div>
  )
}
