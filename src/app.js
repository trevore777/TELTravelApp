import { loadState, saveState, createTrip, getTrip, addStep, deleteStep, deleteTrip } from "./storage.js";
import { initMap, renderTripOnMap } from "./map.js";
import { uuid, formatDateRange, fileToDataUrl, safeText } from "./util.js";
import { searchPlaces, wikiSummary } from "./places.js";
import { callAI } from "./ai.js";

let state = loadState();
let selectedTripId = state.trips[0]?.id || null;
let selectedStepId = null;

initMap("map");

const els = {
  tripList: document.getElementById("tripList"),
  tripMeta: document.getElementById("tripMeta"),
  timeline: document.getElementById("timeline"),

  btnNewTrip: document.getElementById("btnNewTrip"),
  btnAddStep: document.getElementById("btnAddStep"),
  btnExportTrip: document.getElementById("btnExportTrip"),
  btnShareTrip: document.getElementById("btnShareTrip"),

  aiStatus: document.getElementById("aiStatus"),
  aiOutput: document.getElementById("aiOutput"),
  btnAIPlaceInfo: document.getElementById("btnAIPlaceInfo"),
  btnAIPlanDays: document.getElementById("btnAIPlanDays"),
  btnAIFlights: document.getElementById("btnAIFlights"),
  btnAIAccom: document.getElementById("btnAIAccom"),

  // modal
  backdrop: document.getElementById("modalBackdrop"),
  modal: document.getElementById("stepModal"),
  btnCloseModal: document.getElementById("btnCloseModal"),
  stepModalTitle: document.getElementById("stepModalTitle"),
  placeQuery: document.getElementById("placeQuery"),
  placeResults: document.getElementById("placeResults"),
  arrivalDate: document.getElementById("arrivalDate"),
  departureDate: document.getElementById("departureDate"),
  notes: document.getElementById("notes"),
  photos: document.getElementById("photos"),
  btnUseMyLocation: document.getElementById("btnUseMyLocation"),
  btnSaveStep: document.getElementById("btnSaveStep")
};

// Tabs
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    document.getElementById("tabMap").classList.toggle("active", tab === "map");
    document.getElementById("tabTimeline").classList.toggle("active", tab === "timeline");
  });
});

function selectTrip(tripId) {
  selectedTripId = tripId;
  selectedStepId = null;
  render();
}

function selectStep(stepId) {
  selectedStepId = stepId;
  // open the popup on map is handled by marker click; here we just highlight by re-rendering timeline
  renderTimeline();
}

function renderTripList() {
  els.tripList.innerHTML = "";
  for (const trip of state.trips) {
    const div = document.createElement("div");
    div.className = "trip-card" + (trip.id === selectedTripId ? " active" : "");
    div.innerHTML = `
      <div class="trip-title">${escapeHtml(trip.title)}</div>
      <div class="trip-sub">${escapeHtml(formatDateRange(trip.startDate, trip.endDate))}</div>
      <div class="trip-sub">${trip.steps.length} step(s)</div>
    `;
    div.addEventListener("click", () => selectTrip(trip.id));
    els.tripList.appendChild(div);
  }
}

function renderMeta() {
  const trip = selectedTripId ? getTrip(state, selectedTripId) : null;
  if (!trip) {
    els.tripMeta.innerHTML = `<div class="muted">Create a trip to begin.</div>`;
    return;
  }
  els.tripMeta.innerHTML = `
    <div><b>${escapeHtml(trip.title)}</b></div>
    <div>${escapeHtml(formatDateRange(trip.startDate, trip.endDate))}</div>
    <div class="muted">Visibility: ${escapeHtml(trip.visibility)}</div>
    <div class="muted">Steps: ${trip.steps.length}</div>
    <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
      <button id="btnDeleteTrip" class="btn">Delete trip</button>
    </div>
  `;
  document.getElementById("btnDeleteTrip").addEventListener("click", () => {
    if (!confirm("Delete this trip?")) return;
    deleteTrip(state, trip.id);
    selectedTripId = state.trips[0]?.id || null;
    saveState(state);
    render();
  });
}

function renderTimeline() {
  const trip = selectedTripId ? getTrip(state, selectedTripId) : null;
  els.timeline.innerHTML = "";
  if (!trip || !trip.steps.length) {
    els.timeline.innerHTML = `<div class="muted">No steps yet. Click “Add step”.</div>`;
    return;
  }

  for (const step of trip.steps) {
    const card = document.createElement("div");
    card.className = "step-card";
    card.style.outline = step.id === selectedStepId ? "2px solid rgba(74,163,255,.6)" : "none";

    const photosHtml = (step.photos || []).slice(0, 4).map(p => `
      <img src="${p.dataUrl}" alt="" style="width:80px;height:80px;object-fit:cover;border-radius:12px;border:1px solid var(--border);margin-right:8px;" />
    `).join("");

    card.innerHTML = `
      <div class="step-title">${escapeHtml(step.title || step.place?.label || "Step")}</div>
      <div class="step-sub">${escapeHtml(formatDateRange(step.arrivalDate, step.departureDate))}</div>
      <div class="step-sub">${escapeHtml(step.place?.label || "")}</div>
      ${photosHtml ? `<div style="margin-top:10px; display:flex; flex-wrap:wrap;">${photosHtml}</div>` : ""}
      ${step.notes ? `<div class="step-notes">${escapeHtml(step.notes)}</div>` : ""}
      <div class="step-actions">
        <button class="btn" data-action="select">Select</button>
        <button class="btn" data-action="delete">Delete</button>
      </div>
    `;

    card.querySelector('[data-action="select"]').addEventListener("click", () => selectStep(step.id));
    card.querySelector('[data-action="delete"]').addEventListener("click", () => {
      if (!confirm("Delete this step?")) return;
      deleteStep(state, trip.id, step.id);
      saveState(state);
      render();
    });

    els.timeline.appendChild(card);
  }
}

function renderMap() {
  const trip = selectedTripId ? getTrip(state, selectedTripId) : null;
  renderTripOnMap(trip, (stepId) => selectStep(stepId));
}

function render() {
  renderTripList();
  renderMeta();
  renderTimeline();
  renderMap();
}

els.btnNewTrip.addEventListener("click", () => {
  const title = prompt("Trip title:", "New Trip");
  if (title === null) return;
  const trip = createTrip(state, { title, startDate: "", endDate: "" });
  selectedTripId = trip.id;
  saveState(state);
  render();
});

els.btnAddStep.addEventListener("click", () => openStepModal());

els.btnExportTrip.addEventListener("click", () => {
  if (!selectedTripId) return;
  window.open(`./pages/export.html?tripId=${encodeURIComponent(selectedTripId)}`, "_blank");
});

els.btnShareTrip.addEventListener("click", async () => {
  if (!selectedTripId) return;
  const trip = getTrip(state, selectedTripId);
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify(trip))));
  const url = `${location.origin}${location.pathname.replace(/index\.html?$/, "")}pages/share.html#${payload}`;
  await navigator.clipboard.writeText(url).catch(() => {});
  alert("Share link copied to clipboard (or use the URL shown next).");
  els.aiOutput.textContent = url;
});

// Modal / Step creation
let draftPlace = null;

function openStepModal() {
  if (!selectedTripId) {
    alert("Create/select a trip first.");
    return;
  }
  draftPlace = null;
  els.placeQuery.value = "";
  els.placeResults.innerHTML = "";
  els.arrivalDate.value = "";
  els.departureDate.value = "";
  els.notes.value = "";
  els.photos.value = "";
  showModal(true);
}

function showModal(show) {
  els.backdrop.classList.toggle("hidden", !show);
  els.modal.classList.toggle("hidden", !show);
}

els.btnCloseModal.addEventListener("click", () => showModal(false));
els.backdrop.addEventListener("click", () => showModal(false));

els.placeQuery.addEventListener("input", () => {
  searchPlaces(els.placeQuery.value, (results) => {
    els.placeResults.innerHTML = "";
    for (const r of results) {
      const div = document.createElement("div");
      div.className = "result-item";
      div.textContent = r.label;
      div.addEventListener("click", () => {
        draftPlace = r;
        els.placeQuery.value = r.label;
        els.placeResults.innerHTML = "";
      });
      els.placeResults.appendChild(div);
    }
  });
});

els.btnUseMyLocation.addEventListener("click", () => {
  if (!navigator.geolocation) return alert("Geolocation not supported.");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      draftPlace = {
        label: "Current location",
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };
      els.placeQuery.value = "Current location";
      els.placeResults.innerHTML = "";
    },
    () => alert("Could not get location. Check browser permissions."),
    { enableHighAccuracy: true, timeout: 8000 }
  );
});

els.btnSaveStep.addEventListener("click", async () => {
  if (!draftPlace || typeof draftPlace.lat !== "number") {
    alert("Please select a place from search results or use your location.");
    return;
  }
  const photosFiles = Array.from(els.photos.files || []);
  const photos = [];
  for (const f of photosFiles.slice(0, 6)) {
    const dataUrl = await fileToDataUrl(f);
    photos.push({ name: f.name, dataUrl });
  }

  const step = {
    id: uuid(),
    title: (draftPlace.label || "").split(",")[0],
    place: { ...draftPlace },
    arrivalDate: els.arrivalDate.value || "",
    departureDate: els.departureDate.value || "",
    notes: els.notes.value || "",
    photos
  };

  addStep(state, selectedTripId, step);
  saveState(state);
  showModal(false);
  render();
});

// AI buttons
async function runAI(task) {
  const trip = selectedTripId ? getTrip(state, selectedTripId) : null;
  if (!trip) return alert("Select a trip first.");

  const step = selectedStepId ? trip.steps.find(s => s.id === selectedStepId) : trip.steps[trip.steps.length - 1];
  if (!step) return alert("Add/select a step first.");

  els.aiStatus.textContent = "Working…";
  els.aiOutput.textContent = "";

  try {
    const wiki = await wikiSummary(step.place?.label || step.title);

    const payload = {
      task,
      trip: {
        title: trip.title,
        startDate: trip.startDate,
        endDate: trip.endDate
      },
      step: {
        title: step.title,
        label: step.place?.label,
        lat: step.place?.lat,
        lng: step.place?.lng,
        arrivalDate: step.arrivalDate,
        departureDate: step.departureDate,
        notes: step.notes
      },
      sources: {
        wikipedia: wiki
      }
    };

    const out = await callAI(payload);

    els.aiOutput.textContent = safeText(out.text);
    if (out.links?.length) {
      els.aiOutput.textContent += "\n\nLinks:\n" + out.links.map(l => `- ${l}`).join("\n");
    }
  } catch (e) {
    els.aiOutput.textContent = e?.message || "AI request failed.";
  } finally {
    els.aiStatus.textContent = "";
  }
}

els.btnAIPlaceInfo.addEventListener("click", () => runAI("place_info"));
els.btnAIPlanDays.addEventListener("click", () => runAI("plan_days"));
els.btnAIFlights.addEventListener("click", () => runAI("flight_options"));
els.btnAIAccom.addEventListener("click", () => runAI("accom_options"));

// Initial render
render();

function escapeHtml(s) {
  return (s ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
