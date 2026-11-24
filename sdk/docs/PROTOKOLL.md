# Protokoll, Version 1

Alle Meldungen sind `POST`-Anfragen mit JSON, höchstens 256 KB groß. Ausnahmen sind die öffentlichen Abrufe `GET /v1/notices/:app`, `GET /v1/updates/:app`, `GET /v1/stats/:app` und `GET /v1/badge/:app/:art.svg`. Cookies gibt es auf diesen Wegen nicht. CORS erlaubt MoePulse nur für Kennzahlen und Badges, alles andere schicken Server, keine Browser. Die Adresse ist `https://pulse.moestudio.net`.

## Identität

Beim ersten Einschalten oder beim ersten Ticket erzeugt der Client eine zufällige UUID und ein Ed25519-Schlüsselpaar. Beides liegt in `DATA_DIR/moepulse/identity.json` (Rechte `0600`) oder in einem eigenen Speicher. Den öffentlichen Schlüssel schickt er bei jedem Heartbeat und beim ersten Ticket mit. MoePulse merkt ihn sich bei der ersten Meldung und prüft danach jede Anfrage dagegen.

Der Client spricht nur `https`, für Tests auch `http://localhost`. Weiterleitungen behandelt er als Fehler.

## Kopfzeilen

| Kopfzeile            | Inhalt                                      |
| -------------------- | ------------------------------------------- |
| `moepulse-install`   | UUID der Installation                       |
| `moepulse-time`      | Zeit in Millisekunden seit 1970             |
| `moepulse-nonce`     | Einmal-Nummer, 16 Zufallsbytes in Base64url |
| `moepulse-signature` | Ed25519-Signatur in Base64url               |

Signiert wird dieser Text, Zeilen durch `\n` getrennt:

```
MOEPULSE1
POST
/v1/heartbeat
<install>
<time>
<nonce>
<sha256 des Inhalts in Base64url>
```

MoePulse lehnt Anfragen ab, deren Zeit mehr als 15 Minuten abweicht, und jede Einmal-Nummer, die es in dieser Zeit schon gesehen hat.

## `POST /v1/heartbeat`

```json
{
  "protocol": 1,
  "sdk": "1.2.0",
  "key": "<öffentlicher Schlüssel, SPKI DER in Base64url>",
  "app": "moecloud",
  "version": "1.8.0",
  "channel": null,
  "install": "docker",
  "scope": "full",
  "started": 1795500000000,
  "runtime": { "name": "node", "version": "26.13.1" },
  "system": {
    "os": { "platform": "linux", "name": "Debian GNU/Linux 12 (bookworm)", "release": "6.8.12-4-pve", "arch": "x64" },
    "cpu": { "model": "Intel(R) N100", "cores": 4, "load": [0.21, 0.3, 0.25] },
    "memory": { "total": 17179869184, "free": 8589934592, "limit": 2147483648, "process": 188743680 },
    "disk": { "total": 512110190592, "free": 201863462912 },
    "uptime": { "system": 3888000, "process": 86400 },
    "container": "docker",
    "locale": "de-DE",
    "timezone": "Europe/Berlin"
  },
  "features": { "database": "sqlite", "scan": true },
  "metrics": { "users": 4, "files": 18230 },
  "counters": { "upload": 37 }
}
```

Mit `"scope": "errors"` fehlen `system`, `features`, `metrics` und `counters`. Schickt eine Installation das, löscht MoePulse ihre bisherigen Systeminfos.

Antwort:

```json
{
  "ok": true,
  "interval": 21600,
  "errors": true,
  "now": 1795521960000,
  "support": { "unread": 1 },
  "update": {
    "latest": "1.8.1",
    "update": true,
    "security": true,
    "yanked": false,
    "url": "https://moecloud.moestudio.net/changelog.html#1.8.1"
  },
  "notices": [
    {
      "id": 3,
      "level": "security",
      "title": "Sicherheitsupdate 1.8.1",
      "body": "Bitte aktualisiere zeitnah.",
      "link": "https://moestudio.net/moecloud/1.8.1",
      "minVersion": null,
      "maxVersion": "1.8.0",
      "createdAt": 1795500000000
    }
  ]
}
```

`interval` ist der Abstand bis zur nächsten Meldung in Sekunden, `errors: false` heißt: gerade keine Fehlerberichte schicken. `support.unread` zählt Tickets mit einer Antwort, die die App noch nicht abgeholt hat. `notices` enthält die laufenden Hinweise, die zur gemeldeten Version passen. `update` ist die Kurzfassung der Versionsprüfung für die gemeldete Version und den Kanal.

## `POST /v1/events`

```json
{
  "protocol": 1,
  "app": "moecloud",
  "events": [
    {
      "id": "1f6d3f0e-3b5c-4f0e-9a51-6f1a7b0c2d9e",
      "time": 1795521900000,
      "level": "error",
      "type": "TypeError",
      "code": null,
      "message": "Cannot read properties of null (reading 'size')",
      "frames": [{ "fn": "statBlob", "file": "src/services/blobs.ts", "line": 120, "col": 14, "app": true }],
      "raw": "TypeError: Cannot read properties of null (reading 'size')\n    at statBlob (src/services/blobs.ts:120:14)",
      "count": 3,
      "version": "1.8.0",
      "context": { "route": "GET /api/files/:id" },
      "handled": true,
      "origin": "capture"
    }
  ]
}
```

Höchstens 50 Ereignisse pro Anfrage. Gleiche Fehler fasst schon der Client zusammen (`count`). Den Fingerabdruck zum Gruppieren berechnet MoePulse selbst aus Typ und den eigenen Programmstellen der App, ohne Zeilennummern. So bleiben Fehler über Versionen hinweg in einer Gruppe.

Antwort: `{ "ok": true, "accepted": 1 }`

## `POST /v1/forget`

Inhalt `{ "protocol": 1, "app": "moecloud" }`. Löscht die Installation mit allen Verlaufsdaten und Fehlerereignissen. Funktioniert auch, wenn die Annahme pausiert ist.

## Tickets

Fünf Wege, alle signiert wie oben. Der Inhalt hat immer `protocol` und `app`.

| Weg                       | Inhalt zusätzlich                         | Antwort                    |
| ------------------------- | ----------------------------------------- | -------------------------- |
| `POST /v1/tickets/create` | siehe unten                               | `{ ok, ticket, support }`  |
| `POST /v1/tickets/list`   | nichts                                    | `{ ok, tickets, support }` |
| `POST /v1/tickets/get`    | `id`                                      | `{ ok, ticket, support }`  |
| `POST /v1/tickets/reply`  | `id`, `message` (höchstens 5.000 Zeichen) | `{ ok, ticket, support }`  |
| `POST /v1/tickets/close`  | `id`                                      | `{ ok, ticket, support }`  |

```json
{
  "protocol": 1,
  "app": "moecloud",
  "key": "<öffentlicher Schlüssel>",
  "sdk": "1.2.0",
  "version": "1.8.0",
  "runtime": { "name": "node", "version": "26.13.1" },
  "subject": "Upload bricht ab",
  "message": "Seit dem Update bricht jeder Upload über 2 GB ab.",
  "category": "bug",
  "name": "Mia",
  "email": "mia@example.org",
  "diagnostics": null,
  "work": { "time": 1795521960000, "nonce": "48213" }
}
```

`category` ist `bug`, `question`, `idea` oder `other`. `name`, `email` und `diagnostics` sind freiwillig. Die Diagnose hat dieselbe Form wie die Systeminfos im Heartbeat, dazu bis zu zehn der letzten Fehler mit Fingerabdruck.

Kennt MoePulse die Installation noch nicht, legt `create` sie an, aber nur für den Support: Sie taucht in keiner Statistik auf und darf keine Fehlerberichte schicken, bis ein Heartbeat mit Einwilligung kommt. `forget` löscht auch alle Tickets.

### Rechenaufgabe

Vor `create` löst der Client eine kleine Aufgabe gegen Spam. Gesucht ist eine Zahl `nonce`, sodass `sha256(challenge + ":" + nonce)` mit so vielen Null-Bits beginnt, wie MoePulse verlangt (Standard 16):

```
challenge = "MOEPULSE-WORK:" + install + ":" + time + ":" + hex(sha256(subject + "\n" + message))
```

Reicht die Lösung nicht, antwortet MoePulse mit `400` und `{ "error": "work", "bits": 18 }`. Jede Lösung gilt nur einmal und nur 15 Minuten.

## `GET /v1/updates/:app`

Ohne Signatur und ohne Kennung, mit `?version=1.8.0&channel=stable`. Der Kanal ist `stable` oder `beta`, Beta bekommt auch Vorabversionen. Antwort, darf zehn Minuten zwischengespeichert werden:

```json
{
  "ok": true,
  "app": "moecloud",
  "version": "1.8.0",
  "channel": "stable",
  "latest": {
    "version": "1.8.1",
    "title": null,
    "date": 1795510000000,
    "dateText": "24. November 2026",
    "url": "https://moecloud.moestudio.net/changelog.html#1.8.1",
    "security": true,
    "channel": "stable",
    "notes": "### Behoben\n\n- Eine Sicherheitslücke bei Freigaben ist geschlossen."
  },
  "update": true,
  "security": true,
  "yanked": false,
  "behind": 1,
  "releases": [],
  "checkedAt": 1795521960000
}
```

`releases` enthält alle neueren Versionen in derselben Form wie `latest`, neueste zuerst. Zurückgehaltene und zurückgezogene Versionen bietet MoePulse nicht an. Ist die laufende Version zurückgezogen, steht `yanked: true` in der Antwort. Hat MoeStudio für die App eine Version fest vorgegeben, gibt es höchstens bis zu ihr Updates.

## `GET /v1/stats/:app` und `GET /v1/badge/:app/:art.svg`

Nur wenn MoeStudio die öffentlichen Kennzahlen der App eingeschaltet hat, sonst `404`. `stats` liefert `{ installs, active, latest }`, das Badge zeigt die Installationen (`installs.svg`) oder die neueste Version (`version.svg`). Beide dürfen eine Stunde zwischengespeichert und von anderen Seiten eingebunden werden.

## `GET /v1/notices/:app`

Ohne Signatur, damit auch Apps ohne Einwilligung Sicherheitshinweise bekommen. Antwortet mit allen laufenden Hinweisen der App, die Auswahl nach Version trifft der Client. Darf fünf Minuten zwischengespeichert werden.

## Fehlercodes

| Status | `error`                | Was der Client tut                                                      |
| ------ | ---------------------- | ----------------------------------------------------------------------- |
| 400    | `headers`, `invalid`   | Meldung verwerfen                                                       |
| 400    | `work`                 | Rechenaufgabe mit `bits` neu lösen und einmal neu senden                |
| 404    | `not_found`            | Das Ticket gibt es nicht oder es gehört einer anderen Installation      |
| 409    | `duplicate`            | Diese Rechenarbeit wurde schon benutzt                                  |
| 401    | `clock`                | Uhr mit `now` aus der Antwort abgleichen und einmal neu senden          |
| 401    | `signature`, `replay`  | Meldung verwerfen                                                       |
| 403    | `blocked`              | Bis zum Neustart nichts mehr senden                                     |
| 404    | `unknown`              | Erst einen Heartbeat schicken, dann die Fehler                          |
| 409    | `identity`             | Neue Identität erzeugen und neu melden                                  |
| 410    | `app`                  | App ist in MoePulse nicht angelegt, bis zum Neustart nichts mehr senden |
| 413    | `too_large`            | Meldung verwerfen                                                       |
| 429    | `limited`              | Nach `retry` Sekunden wieder versuchen                                  |
| 503    | `paused`, `app_paused` | Nach `retry` Sekunden wieder versuchen                                  |

## Grenzen

| Was                               | Grenze                                                        |
| --------------------------------- | ------------------------------------------------------------- |
| Anfragen pro Adresse              | 600 in 10 Minuten                                             |
| Neue Installationen pro Adresse   | 20 pro Stunde                                                 |
| Heartbeats pro Installation       | 60 pro Stunde                                                 |
| Fehlerereignisse pro Installation | 300 pro Stunde                                                |
| Neue Installationen insgesamt     | 300 pro Stunde, von MoeStudio einstellbar                     |
| Neue Fehlergruppen pro App        | 200 pro Stunde                                                |
| Neue Tickets pro Installation     | 5 am Tag, von MoeStudio einstellbar                           |
| Neue Tickets pro Adresse          | 10 pro Stunde                                                 |
| Neue Tickets insgesamt            | 100 pro Stunde                                                |
| Antworten pro Installation        | 30 pro Stunde                                                 |
| Ticket abrufen pro Installation   | 300 pro Stunde                                                |
| Fehler im Client                  | 60 verschiedene pro Stunde, höchstens 30 in der Warteschlange |

Adressen zählt MoePulse nur im Arbeitsspeicher, gehasht mit einem Schlüssel, der bei jedem Start neu entsteht. Gespeichert werden sie nie.
