import type { ReactNode } from 'react'

export interface MarkdownOptions {
  /** Klick auf einen [[Wikilink]] */
  onWikiLink?: (target: string) => void
  /** Steuert, ob ein Wikilink als vorhanden (gold) oder fehlend (gestrichelt) gerendert wird */
  wikiLinkExists?: (target: string) => boolean
}

/**
 * Kleiner, sicherer Markdown-Renderer ohne Fremdcode und ohne HTML-Injection:
 * Überschriften (#, ##, ###), Listen, Code-Blöcke/-Spans, **fett**, *kursiv*,
 * [Text](URL) und Obsidian-[[Wikilinks]].
 */
export function renderMarkdown(text: string, opts: MarkdownOptions = {}): ReactNode[] {
  const lines = text.split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

    if (line.startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i])
        i++
      }
      i++ // schließendes ```
      blocks.push(
        <pre
          key={key++}
          className="overflow-x-auto rounded-md border border-line bg-night p-3 text-sm"
        >
          <code>{code.join('\n')}</code>
        </pre>,
      )
      continue
    }

    const heading = /^(#{1,3}) (.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const content = inline(heading[2], opts)
      const cls = 'font-serif text-gold'
      blocks.push(
        level === 1 ? (
          <h1 key={key++} className={`${cls} text-2xl`}>{content}</h1>
        ) : level === 2 ? (
          <h2 key={key++} className={`${cls} text-xl`}>{content}</h2>
        ) : (
          <h3 key={key++} className={`${cls} text-lg`}>{content}</h3>
        ),
      )
      i++
      continue
    }

    if (/^[-*] /.test(line)) {
      const items: ReactNode[] = []
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(<li key={items.length}>{inline(lines[i].slice(2), opts)}</li>)
        i++
      }
      blocks.push(
        <ul key={key++} className="list-disc space-y-1 pl-5">
          {items}
        </ul>,
      )
      continue
    }

    if (/^\d+\. /.test(line)) {
      const items: ReactNode[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(
          <li key={items.length}>{inline(lines[i].replace(/^\d+\. /, ''), opts)}</li>,
        )
        i++
      }
      blocks.push(
        <ol key={key++} className="list-decimal space-y-1 pl-5">
          {items}
        </ol>,
      )
      continue
    }

    const paragraph: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('```') &&
      !/^(#{1,3}) /.test(lines[i]) &&
      !/^[-*] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i])
    ) {
      paragraph.push(lines[i])
      i++
    }
    blocks.push(
      <p key={key++} className="leading-relaxed">
        {inline(paragraph.join(' '), opts)}
      </p>,
    )
  }

  return blocks
}

const INLINE_PATTERNS: { type: string; re: RegExp }[] = [
  { type: 'code', re: /`([^`]+)`/ },
  { type: 'bold', re: /\*\*([^*]+)\*\*/ },
  { type: 'italic', re: /\*([^*]+)\*/ },
  { type: 'wiki', re: /\[\[([^\][\n]+)\]\]/ },
  { type: 'link', re: /\[([^\]]+)\]\(([^)\s]+)\)/ },
]

function inline(text: string, opts: MarkdownOptions): ReactNode[] {
  const nodes: ReactNode[] = []
  let rest = text
  let key = 0

  while (rest.length > 0) {
    let earliest: { type: string; match: RegExpExecArray } | null = null
    for (const { type, re } of INLINE_PATTERNS) {
      const match = re.exec(rest)
      if (match && (!earliest || match.index < earliest.match.index)) {
        earliest = { type, match }
      }
    }

    if (!earliest) {
      nodes.push(rest)
      break
    }

    const { type, match } = earliest
    if (match.index > 0) nodes.push(rest.slice(0, match.index))

    if (type === 'code') {
      nodes.push(
        <code key={key++} className="rounded bg-night px-1 py-0.5 text-sm text-gold">
          {match[1]}
        </code>,
      )
    } else if (type === 'bold') {
      nodes.push(<strong key={key++}>{inline(match[1], opts)}</strong>)
    } else if (type === 'italic') {
      nodes.push(<em key={key++}>{inline(match[1], opts)}</em>)
    } else if (type === 'wiki') {
      const target = match[1].trim()
      const exists = opts.wikiLinkExists?.(target) ?? true
      nodes.push(
        <button
          key={key++}
          onClick={() => opts.onWikiLink?.(target)}
          className={
            'cursor-pointer underline underline-offset-2 transition-colors hover:text-gold ' +
            (exists ? 'text-gold' : 'text-muted decoration-dashed')
          }
        >
          {target}
        </button>,
      )
    } else if (type === 'link') {
      nodes.push(
        <a
          key={key++}
          href={match[2]}
          target="_blank"
          rel="noreferrer"
          className="text-gold underline underline-offset-2"
        >
          {match[1]}
        </a>,
      )
    }

    rest = rest.slice(match.index + match[0].length)
  }

  return nodes
}
