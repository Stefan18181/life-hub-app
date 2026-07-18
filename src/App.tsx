import { useState } from 'react'
import { loadTheme, saveTheme, type Theme } from './lib/theme'
import Calendar from './features/calendar/Calendar'
import ClaudeChat from './features/claude/ClaudeChat'
import Notes from './features/notes/Notes'
import Today from './features/overview/Today'
import TopBar from './features/overview/TopBar'
import Search, { type SearchNav } from './features/search/Search'
import Sync from './features/sync/Sync'
import { useAutoBackup } from './features/sync/useAutoBackup'
import Todos from './features/todos/Todos'

const TABS = ['Heute', 'Kalender', 'To-dos', 'Notizen', 'Claude', 'Suche', 'Sync'] as const
type Tab = (typeof TABS)[number]

export default function App() {
  const [tab, setTab] = useState<Tab>('Heute')
  // Sprungziel aus der Suche; wird beim manuellen Tab-Wechsel wieder verworfen.
  const [nav, setNav] = useState<SearchNav | null>(null)
  const [theme, setTheme] = useState<Theme>(() => loadTheme())

  // App-weites automatisches Sichern (nur wenn im Sync-Tab aktiviert).
  useAutoBackup()

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    saveTheme(next)
    setTheme(next)
  }

  function selectTab(t: Tab) {
    setTab(t)
    setNav(null)
  }

  function navigateTo(target: SearchNav) {
    setNav(target)
    setTab(target.tab)
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-3 pb-12 sm:px-4">
      <header className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between sm:py-6">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl text-gold">Life Hub</h1>
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Helles Design' : 'Dunkles Design'}
            title={theme === 'dark' ? 'Helles Design' : 'Dunkles Design'}
            className="rounded-md border border-line px-2 py-1 text-sm text-muted transition-colors hover:border-gold hover:text-gold"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
        <nav className="-mx-3 flex gap-1 overflow-x-auto px-3 sm:mx-0 sm:rounded-lg sm:border sm:border-line sm:bg-card sm:px-1 sm:py-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => selectTab(t)}
              className={
                'shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors ' +
                (tab === t ? 'bg-gold font-semibold text-accentink' : 'text-muted hover:text-ink')
              }
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <TopBar />

      <main>
        {tab === 'Heute' && (
          <Today nav={{ toCalendar: (date) => navigateTo({ tab: 'Kalender', date }) }} />
        )}
        {tab === 'Kalender' && (
          <Calendar
            key={nav?.tab === 'Kalender' ? nav.date : 'cal'}
            initialDate={nav?.tab === 'Kalender' ? nav.date : undefined}
          />
        )}
        {tab === 'To-dos' && (
          <Todos
            key={nav?.tab === 'To-dos' ? nav.todoId : 'todos'}
            highlightId={nav?.tab === 'To-dos' ? nav.todoId : undefined}
          />
        )}
        {tab === 'Notizen' && (
          <Notes
            key={nav?.tab === 'Notizen' ? nav.noteId : 'notes'}
            initialNoteId={nav?.tab === 'Notizen' ? nav.noteId : undefined}
          />
        )}
        {tab === 'Claude' && <ClaudeChat />}
        {tab === 'Suche' && <Search onNavigate={navigateTo} />}
        {tab === 'Sync' && <Sync />}
      </main>
    </div>
  )
}
