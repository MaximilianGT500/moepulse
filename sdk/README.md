# MoePulse-Client

Meldet Installationen, Systeminfos und Fehler einer Moe-App an MoePulse, aber nur, wenn die Admins es erlauben. Dazu der direkte Draht zu MoeStudio: Tickets aus der App, Hinweise wie Sicherheitsupdates und die Versionsprüfung.

- eine Datei, keine Abhängigkeiten, Node.js 22.12 oder neuer
- schickt ohne Einwilligung nichts und legt nichts an
- entfernt Pfade, Adressen, E-Mails, Links und Schlüssel vor dem Senden
- signiert jede Meldung mit einem eigenen Ed25519-Schlüssel der Installation
- spricht nur `https` und folgt keinen Weiterleitungen
- fragt nach Updates ohne Kennung und ohne Einwilligung
- bringt die App nie zum Absturz, auch wenn MoePulse nicht erreichbar ist

## Schnellstart

```ts
import { createPulse, handleSupport } from './lib/moepulse.ts';

export const pulse = createPulse({
  app: 'moeshare',
  version: '3.9.0',
  dataDir: './db',
  consent: () => ({ stats: settings.get('pulse.stats'), errors: settings.get('pulse.errors') }),
});

await pulse.start();
pulse.capture(error, { route: 'POST /upload' });

const update = await pulse.checkUpdate();

app.post('/api/admin/moepulse/support', requireAdmin, async (req, res) => {
  const result = await handleSupport(pulse, req.body);
  res.status(result.status).json(result.body);
});
```

Im Admin-Bereich der App:

```tsx
import { createSupportClient, PulseSupport, PulseUpdate } from './moepulse';

const support = createSupportClient('/api/admin/moepulse/support');

export const Hilfe = () => (
  <>
    <PulseUpdate load={support.update} app="MoeShare" />
    <PulseSupport support={support} developer="Max von MoeStudio" />
  </>
);
```

Die ganze Anleitung mit fertigen Stücken für Fastify, Express und Hono steht in [docs/INTEGRATION.md](docs/INTEGRATION.md).

## Dateien

| Datei                    | Für                                                      |
| ------------------------ | -------------------------------------------------------- |
| `src/moepulse.ts`        | TypeScript-Apps, direkt mit Node.js lauffähig            |
| `dist/moepulse.mjs`      | JavaScript-Apps, ESM und `require()`                     |
| `dist/moepulse.d.mts`    | Typen für `moepulse.mjs`, gehört direkt daneben          |
| `react/PulseConsent.tsx` | Karte für die Einwilligung im Admin-Bereich              |
| `react/PulseSupport.tsx` | Tickets schreiben und Antworten lesen, direkt in der App |
| `react/PulseNotices.tsx` | Hinweise von MoeStudio als Banner                        |
| `react/PulseUpdate.tsx`  | Versionsprüfung mit Notizen und Anleitung                |
| `react/markdown.tsx`     | Sicherer Markdown-Renderer für Notizen, ohne HTML        |
| `react/client.ts`        | `createSupportClient()` für den Weg ins Backend der App  |
| `react/index.ts`         | Alles aus `react/` zum Importieren                       |

Die React-Teile brauchen React 19 und MUI 9 und übernehmen das Theme der App. Der Client selbst braucht nichts davon.

## Mehr dazu

| Dokument                           | Inhalt                                                         |
| ---------------------------------- | -------------------------------------------------------------- |
| [Einbauen](docs/INTEGRATION.md)    | Schritt für Schritt, mit Absatz für die README der App         |
| [Protokoll](docs/PROTOKOLL.md)     | Was über die Leitung geht, Signaturen, Fehlercodes und Grenzen |
| [Datenschutz](docs/DATENSCHUTZ.md) | Was MoePulse speichert, wie lange und wie es verschwindet      |
| [Änderungen](CHANGELOG.md)         | Was sich zwischen den Versionen des Clients geändert hat       |

## Für Admins

Beide Schalter in den Apps stehen ab Werk auf aus. Was genau gesendet würde, zeigt die Vorschau in der App, „Gesendete Daten löschen“ entfernt alles wieder. Mit `MOEPULSE_DISABLED=1` schaltest du den Client fest ab, mit `MOEPULSE_ENDPOINT` leitest du ihn um.

## Am Client arbeiten

Gebraucht wird Node.js 22.18 oder neuer.

```bash
cd sdk
npm ci
npm run check
```

`check` prüft die Typen, startet die Tests gegen ein nachgebautes MoePulse und baut `dist/` neu. Nach jeder Änderung an `src/moepulse.ts` gehört das neue `dist/` mit ins Repository, der Test „dist passt zum Quellcode“ erinnert daran. Bei einer neuen Version erhöhst du `SDK_VERSION` und `version` in `package.json` gemeinsam und ergänzt [CHANGELOG.md](CHANGELOG.md).

Lizenz: MIT. MoePulse selbst, also Server und Dashboard, ist nicht öffentlich.
