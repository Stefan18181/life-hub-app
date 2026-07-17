import Anthropic from '@anthropic-ai/sdk'
import { useEffect, useRef, useState } from 'react'
import {
  buildSystemPrompt,
  CLAUDE_MODEL,
  CLAUDE_TOOLS,
  clearApiKey,
  createClient,
  loadApiKey,
  runTool,
  saveApiKey,
} from '../../lib/claude'
import { loadCategoryNames } from '../../lib/categories'
import { loadEvents } from '../../lib/events'
import { loadNotes } from '../../lib/notes'
import { loadTodos } from '../../lib/todos'

interface ChatMessage {
  /** 'info' sind Werkzeug-Rückmeldungen (z. B. "Termin hinzugefügt"). */
  role: 'user' | 'assistant' | 'info'
  text: string
}

/** Verhindert Endlosschleifen, falls Claude wiederholt Werkzeuge aufruft. */
const MAX_TOOL_ROUNDS = 6

export default function ClaudeChat() {
  const [apiKey, setApiKey] = useState<string | null>(() => loadApiKey())

  if (!apiKey) {
    return <KeySetup onSave={(key) => setApiKey(key)} />
  }
  return <Chat apiKey={apiKey} onResetKey={() => { clearApiKey(); setApiKey(null) }} />
}

function KeySetup(props: { onSave: (key: string) => void }) {
  const [value, setValue] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const key = value.trim()
    if (!key) return
    saveApiKey(key)
    props.onSave(key)
  }

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-line bg-card p-6">
      <h2 className="mb-2 font-serif text-xl text-gold">Claude verbinden</h2>
      <p className="mb-4 text-sm text-muted">
        Für den Chat brauchst du einen eigenen Anthropic-API-Key (erhältlich unter{' '}
        <a
          href="https://platform.claude.com"
          target="_blank"
          rel="noreferrer"
          className="text-gold underline underline-offset-2"
        >
          platform.claude.com
        </a>
        ). Der Key wird nur lokal in deinem Browser gespeichert und direkt an die
        Anthropic API gesendet — nie an andere Server.
      </p>
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="sk-ant-…"
          className="w-full rounded-md border border-line bg-night px-3 py-2 text-sm placeholder:text-muted focus:border-gold focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-accentink transition-opacity hover:opacity-90"
        >
          Speichern
        </button>
      </form>
    </div>
  )
}

function Chat(props: { apiKey: string; onResetKey: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  /** Vollständige API-Historie inkl. tool_use-/tool_result-Blöcken. */
  const apiHistory = useRef<Anthropic.MessageParam[]>([])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  function resetChat() {
    setMessages([])
    setError(null)
    apiHistory.current = []
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy) return

    let display: ChatMessage[] = [...messages, { role: 'user', text }]
    setMessages(display)
    setInput('')
    setError(null)
    setBusy(true)
    setThinking(true)

    // Nutzer-Nachricht in die API-Historie aufnehmen; bei Fehler zurückrollen.
    const rollbackTo = apiHistory.current.length
    apiHistory.current.push({ role: 'user', content: text })

    try {
      const client = createClient(props.apiKey)

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        // Kontext bei jeder Runde neu bauen, damit der Stand aktuell ist.
        const system = buildSystemPrompt(
          loadEvents(),
          loadNotes(),
          new Date(),
          loadTodos(),
          loadCategoryNames(),
        )
        const stream = client.messages.stream({
          model: CLAUDE_MODEL,
          max_tokens: 64000,
          thinking: { type: 'adaptive' },
          system,
          tools: CLAUDE_TOOLS,
          messages: apiHistory.current,
        })

        let assistantText = ''
        let hasBubble = false
        stream.on('text', (delta) => {
          setThinking(false)
          assistantText += delta
          const bubble: ChatMessage = { role: 'assistant', text: assistantText }
          display = hasBubble ? [...display.slice(0, -1), bubble] : [...display, bubble]
          hasBubble = true
          setMessages(display)
        })

        const final = await stream.finalMessage()
        apiHistory.current.push({ role: 'assistant', content: final.content })

        const toolUses = final.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
        )
        if (toolUses.length === 0) break

        const results: Anthropic.ToolResultBlockParam[] = []
        for (const use of toolUses) {
          const outcome = runTool(use.name, use.input)
          results.push({
            type: 'tool_result',
            tool_use_id: use.id,
            content: outcome.summary,
            is_error: outcome.isError,
          })
          display = [...display, { role: 'info', text: outcome.summary }]
          setMessages(display)
        }
        apiHistory.current.push({ role: 'user', content: results })
        setThinking(true)
      }
    } catch (err) {
      apiHistory.current.length = rollbackTo
      setError(describeError(err))
    } finally {
      setBusy(false)
      setThinking(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col rounded-xl border border-line bg-card">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-serif text-lg text-gold">Claude</h2>
        <div className="flex gap-2 text-sm">
          <button
            onClick={resetChat}
            className="rounded-md border border-line px-3 py-1 text-muted transition-colors hover:border-gold hover:text-gold"
          >
            Neuer Chat
          </button>
          <button
            onClick={props.onResetKey}
            className="rounded-md border border-line px-3 py-1 text-muted transition-colors hover:border-gold hover:text-gold"
          >
            Key ändern
          </button>
        </div>
      </header>

      <div className="flex min-h-72 flex-col gap-3 overflow-y-auto p-4" style={{ maxHeight: '60vh' }}>
        {messages.length === 0 && !error && (
          <p className="m-auto max-w-sm text-center font-serif text-muted">
            Frag mich etwas — ich kenne deine Termine und Notiz-Titel, helfe dir
            beim Planen und kann Termine für dich eintragen oder löschen.
          </p>
        )}
        {messages.map((m, i) =>
          m.role === 'info' ? (
            <div
              key={i}
              className="self-center rounded-md border border-gold/30 bg-night px-3 py-1.5 text-xs text-gold"
            >
              {m.text.startsWith('Fehler') ? '⚠ ' : '✓ '}
              {m.text}
            </div>
          ) : (
            <div
              key={i}
              className={
                'max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-2.5 text-sm leading-relaxed ' +
                (m.role === 'user'
                  ? 'self-end bg-gold/15 text-ink'
                  : 'self-start border border-line bg-night text-ink')
              }
            >
              {m.text}
            </div>
          ),
        )}
        {thinking && (
          <div className="self-start rounded-lg border border-line bg-night px-4 py-2.5 text-sm text-muted">
            <span className="animate-pulse">Claude denkt nach …</span>
          </div>
        )}
        {error && (
          <div className="self-start rounded-lg border border-gold/40 bg-night px-4 py-2.5 text-sm text-gold">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nachricht an Claude …"
          disabled={busy}
          className="w-full rounded-md border border-line bg-night px-3 py-2 text-sm placeholder:text-muted focus:border-gold focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || input.trim() === ''}
          className="shrink-0 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-accentink transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Senden
        </button>
      </form>
    </div>
  )
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return 'Der API-Key wurde abgelehnt. Prüfe ihn unter „Key ändern".'
  }
  if (err instanceof Anthropic.RateLimitError) {
    return 'Rate-Limit erreicht — bitte kurz warten und erneut versuchen.'
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return 'Keine Verbindung zur Anthropic API. Bist du online?'
  }
  if (err instanceof Anthropic.APIError) {
    return `API-Fehler (${err.status}): ${err.message}`
  }
  return 'Unerwarteter Fehler beim Senden der Nachricht.'
}
