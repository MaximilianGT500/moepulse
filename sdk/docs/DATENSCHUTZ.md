# Datenschutz in MoePulse

MoePulse sammelt so wenig wie möglich und nur, wenn die Admins einer Installation es ausdrücklich einschalten oder selbst ein Ticket schreiben. Diese Seite beschreibt, was gespeichert wird, wie lange und wie es wieder verschwindet. Eine Rechtsberatung ersetzt sie nicht.

## Grundsätze

- **Freiwillig**: Beide Schalter in den Apps stehen ab Werk auf aus. Ohne Einwilligung schickt der Client nichts und legt keine Dateien an.
- **Getrennt wählbar**: Nutzungsstatistik, Fehlerberichte und Support sind voneinander unabhängig. Wer nur ein Ticket schreibt, taucht in keiner Statistik auf.
- **Nachvollziehbar**: Die Apps zeigen vorab, was genau gesendet würde. [Der Client](../src/moepulse.ts) ist quelloffen, das [Protokoll](PROTOKOLL.md) beschrieben.
- **Löschbar**: „Gesendete Daten löschen“ entfernt die Installation mit allem, was dazugehört, auch ihre Tickets, und auch dann, wenn MoePulse gerade keine Meldungen annimmt.

## Was gespeichert wird

| Bereich     | Inhalt                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| Kennung     | zufällige UUID und öffentlicher Schlüssel der Installation                                              |
| App         | App, Version, Kanal, Installationsart, Version des Clients                                              |
| Laufzeit    | Node.js, Bun oder Deno mit Version                                                                      |
| System      | Plattform, Name und Version des Betriebssystems, Kernel, Architektur, CPU-Modell und Kerne, Last        |
| Speicher    | Arbeitsspeicher gesamt, frei und vom Prozess belegt, Container-Limit, Speicherplatz gesamt und frei     |
| Umgebung    | Container-Art, Zeitzone, Sprache, Laufzeit von System und Prozess                                       |
| Einrichtung | kurze Fakten der App, etwa Datenbank oder ob S3 aktiv ist                                               |
| Kennzahlen  | Anzahlen wie Konten oder Dateien, Zähler wie Uploads                                                    |
| Fehler      | Typ, Code, bereinigte Meldung, Programmstellen, bereinigter Rohtext, kurzer Kontext, Version, Zeitpunkt |
| Verlauf     | Tage mit Meldung, Versionswechsel, Speicher- und Speicherplatzwerte über die Zeit                       |

Nur mit „Fehlerberichte“, ohne „Nutzungsstatistik“, speichert MoePulse von der Installation nur Kennung, App, Version und Laufzeit.

## Tickets

Schreibt ein Admin über die App an MoeStudio, speichert MoePulse:

| Was                | Wann                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------- |
| Betreff, Nachricht | immer, das ist die Anfrage                                                               |
| Kategorie, Version | immer                                                                                    |
| Name, E-Mail       | nur wenn eingetragen, beides ist freiwillig                                              |
| Diagnose           | nur mit Haken bei „Diagnose mitsenden“: Systeminfos wie oben und die letzten zehn Fehler |
| Kennung            | UUID und Schlüssel der Installation, damit nur sie ihre Tickets lesen kann               |

Hatte die Installation keine Einwilligung für Statistik, legt MoePulse sie nur für den Support an. Sie zählt in keiner Statistik und darf keine Fehlerberichte schicken.

Die Rechtsgrundlage ist die Anfrage selbst (Art. 6 Abs. 1 lit. b DSGVO). Benachrichtigungen an Discord enthalten nur App, Nummer und Kategorie, nie Text, Namen oder E-Mail-Adressen.

## Hinweise

Hinweise wie Sicherheitsupdates bekommt eine App mit dem Heartbeat. Apps ohne Einwilligung können sie über `GET /v1/notices/:app` abrufen, aber nur, wenn die App das ausdrücklich tut. Dabei entsteht wie bei jeder Verbindung eine IP-Adresse beim Server. MoePulse speichert sie nicht.

## Versionsprüfung

Fragt eine App nach Updates, schickt sie nur App, Version und Kanal, ohne Kennung. Das klappt ohne Einwilligung, wie bisher bei GitHub, und MoePulse speichert nichts davon. Wie bei jeder Verbindung sieht der Server die IP-Adresse, merkt sie sich aber nicht. Die Versionen selbst holt MoePulse aus GitHub und von den Changelog-Seiten der Apps. Dabei sehen GitHub und die Websites nur den Server von MoePulse, nie die Installationen.

## Öffentliche Kennzahlen und Berichte

Öffentlich ist nur, was MoeStudio pro App einschaltet: die Zahl der Installationen, die aktiven und die neueste Version. Keine einzelne Installation, kein System, kein Land. Auch die Wochenberichte, die MoeStudio sich schicken lässt, enthalten nur Summen.

## Was nicht gespeichert wird

- IP-Adressen. MoePulse nutzt sie nur flüchtig im Arbeitsspeicher, gehasht mit einem bei jedem Start neuen Schlüssel, um Missbrauch zu bremsen.
- Hostnamen, Domains, Benutzernamen und Dateinamen. E-Mail-Adressen nur, wenn jemand sie in ein Ticket schreibt.
- Cookies oder sonstige Kennungen von Besuchern der Apps. MoePulse sieht nur den Server, nie die Menschen, die ihn benutzen.

## Bereinigung

Der Client entfernt vor dem Senden aus Meldungen, Programmstellen, Kontext und Diagnose:

- Pfade außerhalb der App, Home-Ordner und alles in Ordnern mit Nutzerdaten (`paths`), aus `/data/files/mia/urlaub.jpg` wird `[data]/files/…`
- Links bis auf das Schema und den ersten Pfadteil, aus `https://cloud.example.com/api/files/12?token=…` wird `https://[host]/api/…`
- E-Mail-Adressen, IPv4- und IPv6-Adressen, UUIDs, JWTs, Bearer-Tokens, lange Hex- und Base64-Werte
- Werte nach Schlüsseln wie `token`, `secret`, `password`, `session` oder `cookie`
- alles, was die App zusätzlich in `redact` angibt, etwa die eigene Domain

Der Server wendet dieselbe Bereinigung noch einmal an. Den Text eines Tickets bereinigt MoePulse nicht, denn dort steht, was der Admin bewusst schreibt. Entfernt werden nur Steuerzeichen.

## Aufbewahrung

| Daten                               | Standard | Einstellbar         |
| ----------------------------------- | -------- | ------------------- |
| Verlauf der Systemwerte             | 90 Tage  | 30 Tage bis 1 Jahr  |
| Einzelne Fehlerereignisse           | 90 Tage  | 30 Tage bis 1 Jahr  |
| Installationen ohne Meldung         | 1 Jahr   | 90 Tage bis nie     |
| Geschlossene Tickets                | 1 Jahr   | 90 Tage bis 2 Jahre |
| Tage mit Meldung und Fehler pro Tag | 2 Jahre  | fest                |
| Protokoll des Dashboards            | 1 Jahr   | fest                |

Erledigte und ignorierte Fehlergruppen ohne Ereignisse verschwinden nach spätestens 180 Tagen ohne neues Auftreten. Eine Installation mit Tickets bleibt erhalten, bis ihre Tickets gelöscht sind. Interne Notizen zu Tickets sieht nur das Dashboard, nie die App, und sie verschwinden mit dem Ticket.

## Sicherheit

- Jede Meldung ist mit dem Schlüssel der Installation signiert. Andere können sie weder fälschen noch die Daten oder Tickets einer Installation lesen oder löschen.
- Wiederholte Anfragen und stark abweichende Uhren lehnt MoePulse ab.
- Das Dashboard ist nur mit Passkey erreichbar, mit Nutzerprüfung. Heikle Aktionen wie Export oder Löschen brauchen eine frische Bestätigung. Auf Wunsch gibt es das Dashboard nur unter einer eigenen Adresse oder aus bestimmten Netzen.
- Die Datenbank ist nur für den Benutzer von MoePulse lesbar, gelöschte Daten werden überschrieben.
- Strenge Content Security Policy mit Nonce, keine Einbettung in fremde Seiten, keine Indizierung durch Suchmaschinen.
- Schriften und alle Dateien liefert MoePulse selbst aus, es gibt keine Anfragen an Dritte.

MoeStudio hat die Sicherheit in einem Audit geprüft, die Befunde sind behoben und mit Tests abgesichert.

## Auskunft und Löschen

Die Daten der Statistik sind keiner Person zugeordnet. Wer eine Installation betreibt, löscht ihre Daten selbst mit „Gesendete Daten löschen“ in der App, das schließt Tickets ein. MoeStudio kann außerdem einzelne Installationen und Tickets löschen oder Installationen sperren. Wer Auskunft über seine Ticket-Daten möchte oder sie löschen lassen will, schreibt MoeStudio, am einfachsten mit einem Ticket aus der App.
