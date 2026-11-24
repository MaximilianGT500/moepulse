# MoePulse-Client

Meldet Installationen, Systeminfos und Fehler einer Moe-App an MoePulse, aber nur, wenn die Admins es erlauben. Dazu der direkte Draht zum Entwickler: Tickets aus der App und Hinweise wie Sicherheitsupdates.

- eine Datei, keine Abhängigkeiten, Node.js 22.12 oder neuer
- schickt ohne Einwilligung nichts und legt nichts an
- entfernt Pfade, Adressen, E-Mails, Links und Schlüssel vor dem Senden
- signiert jede Meldung mit einem eigenen Ed25519-Schlüssel der Installation
- spricht nur `https` und folgt keinen Weiterleitungen
- bringt die App nie zum Absturz, auch wenn MoePulse nicht erreichbar ist

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

const ticket = await pulse.support.create({ subject: 'Frage zu Freigaben', message: 'Können Freigaben nach einer Woche ablaufen?' });
const update = await pulse.checkUpdate();
app.post('/api/admin/moepulse/support', requireAdmin, async (req, res) => {
  const result = await handleSupport(pulse, req.body);
  res.status(result.status).json(result.body);
});
```

| Datei                    | Für                                                      |
| ------------------------ | -------------------------------------------------------- |
| `src/moepulse.ts`        | TypeScript-Apps, direkt mit Node.js lauffähig            |
| `dist/moepulse.mjs`      | JavaScript-Apps, ESM und `require()`                     |
| `dist/moepulse.d.ts`     | Typen für JavaScript-Apps                                |
| `react/PulseConsent.tsx` | Karte für die Einwilligung im Admin-Bereich              |
| `react/PulseSupport.tsx` | Tickets schreiben und Antworten lesen, direkt in der App |
| `react/PulseNotices.tsx` | Hinweise von MoeStudio als Banner                        |
| `react/PulseUpdate.tsx`  | Versionsprüfung mit Notizen und Anleitung                |
| `react/markdown.tsx`     | Sicherer Markdown-Renderer für Notizen, ohne HTML        |
| `react/client.ts`        | `createSupportClient()` für den Weg ins Backend der App  |

Die React-Teile brauchen nur React und MUI und übernehmen das Theme der App. Die ganze Anleitung steht in `docs/INTEGRATION.md` im internen MoePulse-Projekt. Lizenz: MIT.
