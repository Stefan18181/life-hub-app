# Life Hub

Dein persönlicher Hub für Kalender, To-dos, Notizen und Claude — als installierbare, offline-fähige PWA.

**Live:** https://stefan18181.github.io/life-hub-app/

## Features

- **Kalender** — Monats- und Wochenansicht (Wochenstart Montag). Termine mit optionaler Uhrzeit, **mehrtägig** (Enddatum), **wiederkehrend** (täglich/wöchentlich/monatlich, einzelne Tage ausnehmbar), **bearbeitbar** und mit **Farb-Kategorien** (frei benennbar, als Filter nutzbar).
- **To-dos** — Aufgaben anlegen, abhaken, löschen; Erledigte auf einen Klick aufräumen.
- **Notizen** — Markdown-Editor mit Vorschau und Obsidian-kompatiblen `[[Wikilinks]]` zwischen Notizen.
- **Claude-Chat** — Direkter Chat mit Claude aus dem Browser. Claude kennt Termine (inkl. Kategorien, Wiederholungen, Zeitspannen), Notiz-Titel und offene To-dos als Kontext und kann per Chat Termine anlegen/löschen (auch mehrtägig und mit Kategorie), To-dos verwalten und Notizen anlegen/ergänzen — z. B. „Trag Urlaub von Montag bis Freitag ein, Kategorie Arbeit". Der Anthropic-API-Key bleibt lokal im Browser.
- **Globale Suche** — durchsucht Termine, To-dos und Notizen auf einmal; ein Klick auf einen Treffer springt direkt zum Eintrag.
- **Kopfleiste** — aktuelles Wetter (Open-Meteo, Standort per Browser) und der nächste anstehende Termin.
- **Erinnerungen** — opt-in Browser-Benachrichtigung für Termine, die innerhalb von 30 Minuten anstehen (solange die App geöffnet ist), auch für Wiederholungen.
- **Git-Sync** — sichert Notizen als Markdown-Dateien (Obsidian-kompatibel) sowie Termine und To-dos als JSON in ein GitHub-Repo. Manuell per Knopf oder **automatisch im Hintergrund** (opt-in, lädt nie automatisch herunter).
- **PWA** — installierbar aufs Handy/Desktop, funktioniert offline. Alle Daten werden lokal im Browser gespeichert.
- **Dark/Light-Theme** — umschaltbar in der Kopfzeile, folgt initial der System-Einstellung.

## Einrichtung nach dem ersten Öffnen

1. **Claude:** Im Claude-Tab einen eigenen Anthropic-API-Key hinterlegen (erhältlich unter [platform.claude.com](https://platform.claude.com)).
2. **Git-Sync (optional):** Im Sync-Tab ein GitHub-Repo, einen Branch und einen Fine-grained Personal Access Token (Berechtigung „Contents: Read and write") eintragen — am besten ein eigenes, privates Daten-Repo. Danach optional „Automatisch sichern" aktivieren.

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
