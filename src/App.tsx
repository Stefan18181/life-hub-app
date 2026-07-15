import { useState } from 'react'
import Calendar from './features/calendar/Calendar'
import ClaudeChat from './features/claude/ClaudeChat'
import Notes from './features/notes/Notes'
import TopBar from './features/overview/TopBar'
import Search from './features/search/Search'
import Sync from './features/sync/Sync'
import Todos from './features/todos/Todos'

const TABS = ['Kalender', 'To-dos', 'Notizen', 'Claude', 'Suche', 'Sync'] as const
type Tab = (typeof TABS)[number]

export default function App() {
  const [tab, setTab] = useState<Tab>('Kalender')

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-3 pb-12 sm:px-4">
      <header className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between sm:py-6">
        <h1 className="font-serif text-2xl text-gold">Life Hub</h1>
        <nav className="-mx-3 flex gap-1 overflow-x-auto px-3 sm:mx-0 sm:rounded-lg sm:border sm:border-line sm:bg-card sm:px-1 sm:py-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                'shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors ' +
                (tab === t ? 'bg-gold font-semibold text-night' : 'text-muted hover:text-ink')
              }
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <TopBar />

      <main>
        {tab === 'Kalender' && <Calendar />}
        {tab === 'To-dos' && <Todos />}
        {tab === 'Notizen' && <Notes />}
        {tab === 'Claude' && <ClaudeChat />}
        {tab === 'Suche' && <Search />}
        {tab === 'Sync' && <Sync />}
      </main>
    </div>
  )
}
