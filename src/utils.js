export function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now();
}

export function formatDateRange(a, b) {
  if (!a && !b) return "Dates not set";
  if (a && !b) return `From ${a}`;
  if (!a && b) return `Until ${b}`;
  return `${a} → ${b}`;
}

export function debounce(fn, ms = 400) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export async function fileToDataUrl(file) {
  const buf = await file.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return `data:${file.type};base64,${b64}`;
}

export function safeText(s) {
  return (s ?? "").toString();
}
