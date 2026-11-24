<p align="center">
  <img src="/.github/moepulse.svg" width="96" height="96" alt="MoePulse">
</p>

<h1 align="center">MoePulse-Client</h1>

<p align="center">
  Der Client, mit dem MoeShare, MoeCloud, MoeAuth, MoeCaptcha, MoeDNS, MoeMail und MoeCalendar mit MoePulse sprechen.<br>
  Nutzungsstatistik und Fehlerberichte nur mit Einwilligung, dazu Support aus der App, Hinweise und Updates.
</p>

MoePulse ist ein Dienst von MoeStudio und selbst nicht öffentlich. Öffentlich ist alles, was in die Apps eingebaut wird. So kann jeder nachlesen, was gesendet wird, und andere können den Client in eine Moe-App einbauen.

## Für Admins

- **Nur mit Einwilligung.** Zwei Schalter im Admin-Bereich der App, Nutzungsstatistik und Fehlerberichte, beide ab Werk aus. Ohne Einwilligung schickt der Client nichts und legt keine Datei an.
- **Sparsam.** Gesendet werden eine zufällige Installations-ID, Version, Betriebssystem, Architektur, Arbeitsspeicher, Speicherplatz, Zeitzone und Anzahlen wie Konten oder Dateien. Fehlerberichte kommen ohne Pfade, Adressen und Schlüssel. Inhalte, Namen, E-Mail- und IP-Adressen speichert MoeStudio nicht.
- **Nachvollziehbar.** Die Vorschau in der App zeigt genau, was gesendet würde. „Gesendete Daten löschen“ entfernt alles wieder.
- **Updates ohne Kennung.** Die Versionsprüfung und Sicherheitshinweise laufen ohne Einwilligung und ohne Angaben über deinen Server.
- **Fest abschaltbar** mit `MOEPULSE_DISABLED=1`.

Mehr dazu unter [Datenschutz](/sdk/docs/DATENSCHUTZ.md) und im [Protokoll](/sdk/docs/PROTOKOLL.md).

## Für Entwickler

1. `sdk/src/moepulse.ts` oder `sdk/dist/moepulse.mjs` mit `moepulse.d.mts` in die App kopieren
2. Beim Serverstart `createPulse()` und `start()` aufrufen, Fehler an `pulse.capture()` geben
3. Im Admin-Bereich die Einwilligung, den Support und die Versionsprüfung mit den Komponenten aus `sdk/react` anbieten

```ts
import { createPulse } from './lib/moepulse.ts';

export const pulse = createPulse({
  app: 'moecloud',
  version: config.version,
  dataDir: config.dataDir,
  consent: () => ({ stats: settings.get('pulse.stats'), errors: settings.get('pulse.errors') }),
});

await pulse.start();
```

Die ganze Anleitung steht in [sdk/docs/INTEGRATION.md](/sdk/docs/INTEGRATION.md), die Übersicht über alle Dateien in [sdk/README.md](/sdk/README.md).

## Inhalt

| Ordner      | Inhalt                                                                |
| ----------- | --------------------------------------------------------------------- |
| `sdk/src`   | Der Client in TypeScript, eine Datei ohne Abhängigkeiten              |
| `sdk/dist`  | Derselbe Client als JavaScript mit Typen, fertig zum Kopieren         |
| `sdk/react` | Komponenten für Einwilligung, Support, Hinweise und Updates (MUI)     |
| `sdk/docs`  | Anleitung, Protokoll und Datenschutz                                  |
| `sdk/test`  | Tests gegen ein nachgebautes MoePulse, mit `npm test` im Ordner `sdk` |

## Lizenz

Der Client steht unter der [MIT-Lizenz](/sdk/LICENSE).
