---
name: liftlog-design
description: Verbindliches Design-System von LiftLog. Immer laden, bevor in diesem Repo Oberfläche gebaut oder geändert wird – neue Bildschirme, Karten, Knöpfe, Formulare, Texte, Farben, Abstände, Navigation, Fehlermeldungen (auch bei "UI", "Design", "Layout", "Komponente", "Screen", "Tab", "styling"). Hat Vorrang vor allgemeinen Design-Skills wie ui-ux-pro-max oder frontend-ui-engineering.
---

# LiftLog-Design

LiftLog sieht überall gleich aus: ruhig, dunkel (mit automatischem Hellmodus), wenig Text, eine Akzentfarbe (Ice Cyan). Neue Oberflächen fügen sich ein, statt einen eigenen Stil mitzubringen. Wenn ein allgemeiner Design-Skill etwas anderes empfiehlt, gilt dieser Skill.

## Grundsätze

1. **Wenig Text.** Ein kurzer Satz statt Absatz. Keine Erklärzeilen unter jeder Überschrift, keine Disclaimer-Blöcke. Wenn etwas ohne Text verständlich ist, kommt kein Text dazu.
2. **Das Wichtigste zuerst.** Oben steht, was der Nutzer jetzt sehen oder tun muss (z. B. „Noch offen“ bei den Ernährungszielen). Einstellungen sind zugeklappt hinter einem Link („Ziele ändern“, „Angaben ergänzen“).
3. **Nichts doppelt.** Jede Aktion gibt es an genau einer Stelle (Abmelden nur oben rechts bzw. in der Seitenleiste, Pausenlänge nur in der Pausenleiste).
4. **Gleiche Dinge sehen gleich aus.** Vor/Zurück, Karten, Titel, Knöpfe und Links nutzen die gemeinsamen Klassen aus `src/lib/ui.ts`. Keine neuen Varianten erfinden.
5. **Handy zuerst.** Gebaut wird für 390 px Breite, es muss bei 320 px ohne seitliches Scrollen funktionieren. Tippflächen mindestens 44 px (`min-h-11`, `h-11 w-11`).
6. **Deutsch, kurz, du-Form.** UI-Texte auf Deutsch, Knöpfe mit Verb („Woche speichern“, „Ziele ändern“).

## Bausteine (`src/lib/ui.ts`)

| Konstante | Wofür |
|---|---|
| `CARD` | Jeder Bereich ist eine Karte: `rounded-2xl border border-line/[0.08] bg-surface p-4` |
| `SECTION_TITLE` | Titel einer Karte (`<h2 className={SECTION_TITLE}>`). Schrift und Großbuchstaben kommen automatisch aus `index.css`. |
| `PRIMARY_BUTTON` | Hauptaktion, höchstens eine pro Karte. Neon mit schwarzem Text. |
| `SECONDARY_BUTTON` | Nebenaktion. |
| `INPUT` | Eingabefeld. In einer Flex-Zeile die Klassen ohne `w-full` nutzen, sonst rutschen Knöpfe aus dem Bild. |
| `NAV_BUTTON` | Eckiger Vor/Zurück-Knopf mit `ChevronLeftIcon`/`ChevronRightIcon` aus `src/lib/icons.tsx`. |
| `LINK` | Textlink in Akzentfarbe, **ohne Unterstrich**. |

Weitere gemeinsame Teile:
- `src/components/DoneStamp.tsx`: grüner „DONE“-Stempel, wenn etwas abgeschlossen wird.
- Icons nur aus `src/lib/icons.tsx` (eigene SVGs dort ergänzen, keine Icon-Bibliothek).

## Farben

Nur die Design-Tokens aus `src/index.css` verwenden, dann stimmen Dunkel- und Hellmodus von selbst:

- Flächen: `bg-surface`, `bg-surface-inset`, `bg-surface-raised`, `bg-control`, `bg-control-hover`
- Text: `text-foreground`, `text-muted`, Akzent `text-accent-ink`
- Linien: `border-line/[0.08]`, Trenner `divide-line/[0.06]`
- Akzent: `bg-neon` (Text darauf `text-black`)
- Status: `text-success` / `bg-success`, `text-danger` / `bg-danger`, `text-warning`

**Verboten:** feste Hex-Farben (`bg-[#1C1C1E]`, `text-[#8E8E93]`), alte Tailwind-Farben (`neutral-*`, `gray-*`, `yellow-*`, `red-*`), Unterstreichungen für Links, eigene Schatten oder Verläufe. Einzige Ausnahme ist das Onboarding, das als Vollbild über Fotos liegt.

## Muster

**Kopfzeile mit Vor/Zurück** (Statistik-Monat, Wochenplanung, Ernährungs-Tag):

```tsx
<nav className="flex items-center justify-between gap-2" aria-label="Tag wählen">
  <button className={NAV_BUTTON} type="button" aria-label="Vorheriger Tag" onClick={…}><ChevronLeftIcon className="h-5 w-5" /></button>
  <div className="min-w-0 text-center">
    <h1 className="text-xl">Heute</h1>
    <p className="text-sm tabular-nums text-muted">Sonntag, 8. November</p>
  </div>
  <button className={NAV_BUTTON} type="button" aria-label="Nächster Tag" disabled={…} onClick={…}><ChevronRightIcon className="h-5 w-5" /></button>
</nav>
```

**Karte mit Titel und Link rechts:**

```tsx
<section className={CARD} aria-labelledby="goals-heading">
  <div className="flex items-center justify-between gap-3">
    <h2 id="goals-heading" className={SECTION_TITLE}>Noch offen</h2>
    <button className={LINK} type="button" onClick={…}>Ziele ändern</button>
  </div>
  …
</section>
```

**Listen in einer Karte:** `<ul className="mt-2 divide-y divide-line/[0.06]">`, Zeilen mit `py-1.5` bis `py-2`, Name links, Wert rechts in `text-muted tabular-nums`.

**Gefährliche Aktionen** (Löschen, Zurücksetzen): zweiter Tipp statt Dialog. Erster Tipp ändert den Knopf zu „Sicher? Nochmal tippen“ (rot hinterlegt), nach 3 Sekunden ohne zweiten Tipp zurück. Beispiele: Stoppuhr zurücksetzen, Trainingsplan löschen.

**Abschluss feiern:** Wird etwas fertig (alle Sätze einer Übung, ein Tagesziel, alle Supplemente), kommt der `DoneStamp` – aber nur im Moment des Abschließens, nie beim Öffnen eines schon fertigen Zustands.

**Zahlen eingeben:** normales `<input inputMode="decimal">` (Komma erlaubt) bzw. `inputMode="numeric"` mit `enterKeyHint="done"`. Keine Drehräder für Gewicht, Wiederholungen oder Sätze. Plus/Minus-Knöpfe daneben sind in Ordnung.

**Zustände:** Laden „Wird geladen …“ (`text-sm text-muted`), Fehler mit `role="alert"` in `text-danger`, leerer Zustand ein Satz plus eine Aktion.

**Navigation:** Reihenfolge der Tabs ist Training, Trainingsplan, Ernährung, Statistik, Profil. Neue Bereiche werden mit dem Projekt-Owner abgesprochen, nicht einfach als sechster Tab angehängt.

**Seitenränder:** Die Hauptfläche in `HomeScreen.tsx` hat schon `px-4`. Bildschirme bringen keinen eigenen seitlichen Abstand mit; Karten stehen mit `space-y-4` untereinander.

## Code-Aufteilung

- Logik (Rechnen, Formatieren, Regeln) gehört nach `src/domain/` und bekommt Vitest-Tests.
- Supabase-Aufrufe nur in `src/features/*/api.ts`.
- Kommentare auf Deutsch, kurz und nur dort, wo das Warum nicht offensichtlich ist.

## Prüfen, bevor committet wird

- [ ] Nur Klassen aus `src/lib/ui.ts` und Design-Tokens, keine Hex-Farben, keine Unterstreichungen
- [ ] Texte gekürzt: Gibt es einen Satz, der wegfallen kann? Dann weg damit.
- [ ] Nichts doppelt zu einer bestehenden Stelle
- [ ] Im Browser bei 320, 390 und 1280 px geprüft, kein seitliches Scrollen (`document.documentElement.scrollWidth <= innerWidth`)
- [ ] Dunkel- und Hellmodus angeschaut
- [ ] `bun run lint`, `bun run test`, `bun run build` grün
- [ ] Dem Entwickler lokal gezeigt (`bun run dev --host`, Links für Laptop und Handy), erst nach seinem OK committen
