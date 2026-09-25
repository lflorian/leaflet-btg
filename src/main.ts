import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Größe
const W = 3507;
const H = 2480;
// Ab dieser Zoomstufe einzelne Terminals, darunter ein Etikett pro Gebäude
const DETAIL_ZOOM = 0;

export type Terminal = {
  id: string;
  building: string;
  location: string;
  image?: string;
  mdb?: boolean;
  x?: number;
  y?: number;
};

const toLatLng = (x: number, y: number): L.LatLngTuple => [H - y, x];
const toXY = (p: L.LatLng) => ({
  x: Math.round(p.lng),
  y: Math.round(H - p.lat),
});

const bounds: L.LatLngBoundsExpression = [
  [0, 0],
  [H, W],
];
const map = L.map("map", {
  crs: L.CRS.Simple,
  minZoom: -2,
  maxZoom: 3,
  attributionControl: false,
});
L.imageOverlay("plan.svg", bounds).addTo(map);
map.fitBounds(bounds);
map.setMaxBounds(bounds);

// Für MdB nutzbar, außer ausdrücklich `mdb: false`
const forMdb = (t: Terminal) => t.mdb !== false;
const icons = Object.fromEntries(
  ["mdb-yes", "mdb-no"].map((c) => [
    c,
    L.divIcon({ className: `terminal ${c}`, iconSize: [16, 16] }),
  ]),
);
const markers = L.layerGroup();
const buildings = L.layerGroup();
const addMarker = (t: Terminal) =>
  L.marker(toLatLng(t.x!, t.y!), {
    icon: icons[forMdb(t) ? "mdb-yes" : "mdb-no"],
    title: `${t.building} – ${t.location}`,
  })
    .bindPopup(
      `<b>${t.location}</b><br>${t.building}<br><small>ID: ${t.id}</small>` +
        `<br>Für MdB nutzbar: ${forMdb(t) ? "ja" : "nein"}` +
        (t.image
          ? `<br><img src="bilder/${t.image}" alt="" width="240" height="180" style="object-fit:cover;margin-top:6px">`
          : ""),
    )
    .addTo(markers);

const terminals: Terminal[] = await fetch("terminals.json").then((r) =>
  r.json(),
);
const params = new URLSearchParams(location.search);
const editing = params.has("edit");

const byBuilding = new Map<string, { points: L.LatLng[]; mdb: number }>();
let targetMarker: L.Marker | undefined;
for (const t of terminals) {
  if (t.x == null || t.y == null) continue;
  const marker = addMarker(t);
  const b = byBuilding.get(t.building) ?? { points: [], mdb: 0 };
  b.points.push(marker.getLatLng());
  if (forMdb(t)) b.mdb++;
  byBuilding.set(t.building, b);
  if (t.id === params.get("t")) targetMarker = marker;
}

if (targetMarker) {
  map.setView(targetMarker.getLatLng(), 1, { animate: false });
} else if (byBuilding.size) {
  // Startansicht: alle Terminals im Bild, höchstens so nah, dass noch die Gebäude-Übersicht zu sehen ist
  map.fitBounds(
    L.latLngBounds([...byBuilding.values()].flatMap((b) => b.points)).pad(0.2),
    { maxZoom: DETAIL_ZOOM - 1, animate: false },
  );
}

// Gebäude-Etikett mit Anzahl in der Mitte seiner Terminals (Name als Tooltip), Klick zoomt hinein.
// Magenta, sobald dort mindestens ein Terminal für MdB nutzbar ist.
for (const [name, { points, mdb }] of byBuilding) {
  const b = L.latLngBounds(points);
  L.marker(b.getCenter(), {
    icon: L.divIcon({
      className: `building${mdb ? " mdb-yes" : ""}`,
      iconSize: [0, 0],
      html: `<span>${points.length}</span>`,
    }),
    title: `${name}: ${points.length} Terminals, davon ${mdb} für MdB nutzbar`,
  })
    .on("click", () =>
      map.setView(
        b.getCenter(),
        Math.min(
          Math.max(map.getBoundsZoom(b.pad(0.5)), DETAIL_ZOOM),
          DETAIL_ZOOM + 1,
        ),
      ),
    )
    .addTo(buildings);
}

const update = () => {
  const detail = editing || map.getZoom() >= DETAIL_ZOOM;
  map
    .addLayer(detail ? markers : buildings)
    .removeLayer(detail ? buildings : markers);
};
map.on("zoomend", update);
update();
targetMarker?.openPopup();

const legend = new L.Control({ position: "bottomright" });
legend.onAdd = () => {
  const div = L.DomUtil.create("div", "legend");
  div.innerHTML =
    '<div><i class="mdb-yes"></i>für MdB nutzbar</div><div><i class="mdb-no"></i>nicht für MdB nutzbar</div>';
  return div;
};
legend.addTo(map);

// Editor mit ?edit – eigene Datei, wird nur dann geladen. Speichert nichts auf dem Server, nur einen JSON-Download.
if (editing) {
  const { startEditor } = await import("./editor");
  startEditor(map, markers, terminals, addMarker, toXY);
}
