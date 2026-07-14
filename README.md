# Life Hub

Dein persönlicher Hub für Kalender, Notizen und Claude — als installierbare, offline-fähige PWA.

**Live:** https://stefan18181.github.io/life-hub-app/

## Features

- **Kalender** — Monatsansicht mit Terminverwaltung (optional mit Uhrzeit), Wochenstart Montag.
- **Notizen** — Markdown-Editor mit Vorschau und Obsidian-kompatiblen `[[Wikilinks]]` zwischen Notizen.
- **Claude-Chat** — Direkter Chat mit Claude aus dem Browser. Claude kennt deine Termine und Notiz-Titel als Kontext. Der Anthropic-API-Key bleibt lokal im Browser.
- **Git-Sync** — Sichert Notizen als Markdown-Dateien und Termine als JSON in ein GitHub-Repo (Obsidian-kompatibel).
- **PWA** — Installierbar aufs Handy/Desktop, funktioniert offline. Termine und Notizen werden lokal im Browser gespeichert.

## Einrichtung nach dem ersten Öffnen

1. **Claude:** Im Claude-Tab einen eigenen Anthropic-API-Key hinterlegen (erhältlich unter [platform.claude.com](https://platform.claude.com)).
2. **Git-Sync (optional):** Im Sync-Tab ein GitHub-Repo, einen Branch und einen Fine-grained Personal Access Token eintragen.

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server unter http://localhost:5173/life-hub-app/
npm test         # Unit-Tests (Vitest)
npm run build    # Produktions-Build nach dist/
```

## Deployment

Automatisch über GitHub Pages bei jedem Push auf `main` (Workflow `.github/workflows/deploy.yml`, Node 22). Voraussetzung: Repo ist öffentlich und unter **Settings → Pages** ist als Quelle **„GitHub Actions"** ausgewählt.

## Technik

Vite · React 19 · TypeScript · Tailwind CSS 4 · vite-plugin-pwa · Anthropic SDK
