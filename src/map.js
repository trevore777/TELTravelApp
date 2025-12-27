let map;
let markersLayer;
let routeLine;

function waitForLeaflet(timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      if (window.L) return resolve(window.L);
      if (Date.now() - start > timeoutMs) return reject(new Error("Leaflet not available (window.L missing)."));
      setTimeout(check, 50);
    })();
  });
}

export async function ensureMap(elId = "map") {
  if (map) return map;

  const L = await waitForLeaflet();

  map = L.map(elId, { zoomControl: true }).setView([-27.4705, 153.0260], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
  return map;
}

export function renderTripOnMap(trip, onMarkerClick) {
  if (!map || !window.L || !markersLayer) return;

  const L = window.L;

  markersLayer.clearLayers();
  if (routeLine) routeLine.remove();

  if (!trip || !trip.steps?.length) {
    map.setView([-27.4705, 153.0260], 6);
    return;
  }

  const pts = [];
  for (const step of trip.steps) {
    const { lat, lng, label } = step.place || {};
    if (typeof lat !== "number" || typeof lng !== "number") continue;

    pts.push([lat, lng]);

    const marker = L.marker([lat, lng]).addTo(markersLayer);
    marker.bindPopup(`<b>${escapeHtml(step.title || label || "Step")}</b><br/>${escapeHtml(label || "")}`);
    marker.on("click", () => onMarkerClick?.(step.id));
  }

  if (pts.length >= 2) {
    routeLine = L.polyline(pts, { weight: 4, opacity: 0.8 }).addTo(map);
  }

  const bounds = L.latLngBounds(pts);
  map.fitBounds(bounds.pad(0.2));
}

function escapeHtml(s) {
  return (s ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
