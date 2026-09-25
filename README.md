# leaflet-btg (Terminalkarte)
Interaktive Karte der DiAnE-Zeiterfassungsterminals auf Basis von [Leaflet](https://leafletjs.com) mit über einem eigenen Übersichtsplan. Ohne externe Verbindungen oder Backend.


## Entwicklung
```bash
npm install
npm run dev      # Dev-Server mit Hot Reload
npm run build    # erzeugt dist/ zum Ablegen auf dem Intranet-Webserver
```


## Pflegehinweise
Im `dist/`-Ordner (bzw. in `public/`) liegen:

- `plan.svg` – Übersichtsplan
- `terminals.json` – Terminals
- `bilder/` – Fotos der Terminals

Für MdB nutzbare Terminals sind magenta, andere nutzbare grau (Farben in `index.html`).

Diese Daten sind intern und daher nicht im Repository. Zum lokalen Ausprobieren `public/terminals.example.json` nach `public/terminals.json` kopieren und einen eigenen `plan.svg` (3507 × 2480 px) in `public/` ablegen.


## Terminals positionieren
`index.html?edit` öffnet den Editor: Terminal in der Liste wählen oder mit „+ Neues Terminal“ anlegen, Felder bearbeiten, bei Terminals ohne Position auf die Karte klicken, platzierte Punkte per Ziehen verschieben, dann „terminals.json speichern“. Der Editor speichert nichts auf dem Server, er erzeugt nur einen Download. Die Datei geht an den Webmaster, der sie austauscht. Über „Zwischenstand laden“ lässt sich eine gespeicherte Datei später wieder öffnen und weiterbearbeiten.

## Deep Links
`?t=<Terminal-ID>` zoomt direkt zum Terminal, z. B. `index.html?t=T-003`.
