let map;
let markersLayer;
let routeLine;

export function initMap(elId = "map") {
  map = L.map(elId, { zoomControl: true }).setView([-27.4705, 153.0260], 6); // Brisbane default
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
  return map;
}

export function renderTripOnMap(trip, onMarkerClick) {
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
