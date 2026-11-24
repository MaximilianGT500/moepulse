# Änderungen am Client

## 1.3.0 – 24.11.2026

**Neu**

- `checkUpdate()` liefert `supported` und `minimum`: Ist die laufende Version älter als die Mindestversion, die MoeStudio vorgibt, steht `supported: false` darin. `update()` und der Heartbeat bringen `supported` ebenfalls mit
- `PulseUpdate` warnt deutlich, wenn die Version nicht mehr unterstützt wird

Ältere MoePulse-Server schicken das Feld nicht, dann gilt die Version als unterstützt.

## 1.2.0 – 24.11.2026

**Neu**

- `pulse.checkUpdate()` fragt MoePulse statt GitHub nach neuen Versionen, ohne Kennung und ohne Einwilligung, mit zehn Minuten Zwischenspeicher
- `pulse.update()` liefert die Kurzfassung ohne Netzwerk, Heartbeats bringen sie mit
- `handleSupport()` versteht `{ action: 'update' }`
- React: `PulseUpdate` mit Notizen und Anleitung, `Markdown` als sicherer Renderer ohne HTML
- Anleitung, Protokoll und Datenschutz liegen jetzt in `docs/`, dazu eigene Tests und `npm run check` direkt im Ordner `sdk`

**Geändert**

- Die Typen heißen jetzt `dist/moepulse.d.mts`, so findet TypeScript sie neben `moepulse.mjs`. Wer `moepulse.d.ts` in eine App kopiert hat, ersetzt sie

## 1.1.0 – 24.11.2026

**Neu**

- `pulse.support` für Tickets: anlegen, lesen, beantworten, schließen und ungelesene Antworten, mit Rechenaufgabe gegen Spam
- `pulse.notices()` und `pulse.fetchNotices()` für Hinweise wie Sicherheitsupdates
- `handleSupport()` für den Weg im Backend der App
- React: `PulseSupport`, `PulseNotices` und `createSupportClient()`

**Sicherheit**

- Nur noch `https`, für Tests auch `http://localhost`, keine Weiterleitungen und Größenlimits für Antworten
- Bereinigung ohne ReDoS-anfällige Muster, lange Texte werden vorher gekürzt

## 1.0.0 – 24.11.2026

Erste Version: Einwilligung in zwei Stufen, Heartbeat mit Systeminfos, bereinigte Fehlerberichte, Absturzberichte beim nächsten Start, Vorschau, `forget()`, Ed25519-Signaturen und die React-Karte `PulseConsent`.
