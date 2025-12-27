import { uuid } from "./util.js";

const KEY = "tj.v1";

const defaultState = {
  trips: [],
  settings: {
    units: "metric"
  }
};

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultState), ...parsed };
  } catch {
    return structuredClone(defaultState);
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function createTrip(state, { title, startDate, endDate }) {
  const trip = {
    id: uuid(),
    title: title || "New Trip",
    startDate: startDate || "",
    endDate: endDate || "",
    visibility: "private",
    steps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.trips.unshift(trip);
  return trip;
}

export function getTrip(state, tripId) {
  return state.trips.find(t => t.id === tripId) || null;
}

export function addStep(state, tripId, step) {
  const trip = getTrip(state, tripId);
  if (!trip) throw new Error("Trip not found");
  trip.steps.push(step);
  trip.updatedAt = new Date().toISOString();
}

export function updateStep(state, tripId, stepId, patch) {
  const trip = getTrip(state, tripId);
  if (!trip) throw new Error("Trip not found");
  const s = trip.steps.find(x => x.id === stepId);
  if (!s) throw new Error("Step not found");
  Object.assign(s, patch);
  trip.updatedAt = new Date().toISOString();
}

export function deleteStep(state, tripId, stepId) {
  const trip = getTrip(state, tripId);
  if (!trip) throw new Error("Trip not found");
  trip.steps = trip.steps.filter(s => s.id !== stepId);
  trip.updatedAt = new Date().toISOString();
}

export function deleteTrip(state, tripId) {
  state.trips = state.trips.filter(t => t.id !== tripId);
}
