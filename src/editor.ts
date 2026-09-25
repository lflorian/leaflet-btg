import type L from 'leaflet';
import type { Terminal } from './main';

const FIELDS = {
  id: 'ID',
  building: 'Gebäude',
  location: 'Standort',
  image: 'Bild (optional, Dateiname in bilder/)',
} as const;
const OPTIONAL = ['image'];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

// Terminal in der Liste oder per Klick auf seinen Punkt wählen oder anlegen, Felder bearbeiten, auf die Karte klicken, Marker ggf. verschieben, JSON speichern.
export function startEditor(
  map: L.Map,
  markers: L.LayerGroup,
  terminals: Terminal[],
  addMarker: (t: Terminal) => L.Marker,
  toXY: (p: L.LatLng) => { x: number; y: number },
) {
  let selected: Terminal | undefined;
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:absolute;top:10px;right:10px;z-index:1000;width:250px;max-height:90%;overflow:auto;display:flex;flex-direction:column;gap:4px;padding:8px;background:#fff;font:13px sans-serif;box-shadow:0 1px 5px #0006';
  document.body.append(panel);

  const label = (t: Terminal) => `${t.x == null ? '○' : '✓'} ${t.id || 'neu'} – ${t.location}`;

  const drawMarkers = () => {
    markers.clearLayers();
    for (const t of terminals) {
      if (t.x == null || t.y == null) continue;
      const m = addMarker(t);
      m.dragging?.enable();
      m.on('dragend', () => Object.assign(t, toXY(m.getLatLng())));
      // Klick auf den Punkt wählt das Terminal im Panel; nur das Panel neu zeichnen, damit das Popup offen bleibt
      m.on('click', () => {
        selected = t;
        drawPanel();
        panel.querySelector('#form')?.scrollIntoView({ block: 'start' });
      });
    }
  };

  const drawPanel = () => {
    const list = terminals
      .map((t, i) => `<button data-i="${i}" style="text-align:left;${t === selected ? 'background:#fc0' : ''}">${esc(label(t))}</button>`)
      .join('');
    const form = selected
      ? '<hr id="form" style="width:100%">' +
        Object.entries(FIELDS)
          .map(([k, label]) => `<label>${label}<br><input name="${k}" value="${esc(selected![k as keyof typeof FIELDS] ?? '')}" style="width:100%;box-sizing:border-box"></label>`)
          .join('') +
        `<label>Für MdB nutzbar<br><select name="mdb" style="width:100%">${[['true', 'ja'], ['false', 'nein']]
          .map(([v, l]) => `<option value="${v}"${String(selected!.mdb !== false) === v ? ' selected' : ''}>${l}</option>`)
          .join('')}</select></label>` +
        (selected.x == null ? '<small>Klick auf die Karte setzt die Position.</small>' : '<small>Punkt auf der Karte ziehen, um ihn zu verschieben.</small>') +
        '<button id="delete">Terminal löschen</button><hr style="width:100%">'
      : '';
    panel.innerHTML =
      list +
      form +
      '<button id="add">+ Neues Terminal</button><button id="save"><b>terminals.json speichern</b></button>' +
      '<label>Zwischenstand laden<br><input type="file" id="load" accept=".json,application/json" style="width:100%"></label>';
  };

  const redraw = () => {
    drawMarkers();
    drawPanel();
  };

  panel.onclick = (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    if (b.id === 'save') {
      const ids = terminals.map((t) => t.id);
      if (ids.includes('') || new Set(ids).size !== ids.length) return alert('Jedes Terminal braucht eine eindeutige ID.');
      // eine Zeile pro Terminal, damit Änderungen im Diff lesbar bleiben
      const json = `[\n${terminals.map((t) => '  ' + JSON.stringify(t)).join(',\n')}\n]\n`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = 'terminals.json';
      a.click();
      return;
    }
    if (b.id === 'add') terminals.push((selected = { id: '', building: '', location: '' }));
    else if (b.id === 'delete') {
      if (!confirm(`„${selected!.id || 'neu'}“ löschen?`)) return;
      terminals.splice(terminals.indexOf(selected!), 1);
      selected = undefined;
    } else selected = terminals[Number(b.dataset.i)];
    redraw();
    if (b.id === 'add') panel.querySelector('input')?.focus();
  };

  // Übernehmen beim Verlassen des Feldes. Nur Marker und Listeneintrag neu zeichnen –
  // ein komplettes redraw würde den Button ersetzen, auf den gerade geklickt wird.
  panel.onchange = (e) => {
    const input = e.target as HTMLInputElement;
    if (input.id === 'load') return load(input.files![0]);
    if (input.name === 'mdb') {
      selected!.mdb = input.value === 'true';
      return drawMarkers();
    }
    const value = input.value.trim();
    if (OPTIONAL.includes(input.name) && !value) delete selected![input.name as keyof typeof FIELDS];
    else selected![input.name as keyof typeof FIELDS] = value;
    drawMarkers();
    panel.querySelector(`[data-i="${terminals.indexOf(selected!)}"]`)!.textContent = label(selected!);
  };

  // Zwischenstand: eine zuvor gespeicherte terminals.json ersetzt die aktuelle Liste
  const load = async (file: File) => {
    let data: Terminal[];
    try {
      data = JSON.parse(await file.text());
      if (!Array.isArray(data) || !data.every((t) => t && typeof t.id === 'string')) throw 0;
    } catch {
      drawPanel();
      return alert('Die Datei ist keine gültige terminals.json.');
    }
    if (!confirm(`${data.length} Terminals aus „${file.name}“ laden? Nicht gespeicherte Änderungen gehen verloren.`)) return drawPanel();
    terminals.splice(0, terminals.length, ...data);
    selected = undefined;
    redraw();
  };

  // Klick setzt nur die erste Position; bereits platzierte Terminals werden ausschließlich per Drag verschoben
  map.on('click', (e) => {
    if (!selected || selected.x != null) return;
    Object.assign(selected, toXY(e.latlng));
    redraw();
  });

  redraw();
}
