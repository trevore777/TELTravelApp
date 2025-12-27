import { debounce } from "./util.js";

/**
 * Nominatim search (OpenStreetMap). Debounce requests.
 * Note: Be respectful with rate limits (1 req/sec). Cache in memory.
 */
const cache = new Map();

export const searchPlaces = debounce(async (query, cb) => {
  const q = (query || "").trim();
  if (q.length < 3) return cb([]);
  if (cache.has(q)) return cb(cache.get(q));

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");

  const res = await fetch(url.toString(), {
    headers: {
      // Keep it simple; Vercel static will send a browser UA.
      "Accept": "application/json"
    }
  });
  if (!res.ok) return cb([]);

  const data = await res.json();
  const results = (data || []).map(x => ({
    label: x.display_name,
    lat: Number(x.lat),
    lng: Number(x.lon)
  }));

  cache.set(q, results);
  cb(results);
}, 500);

export async function wikiSummary(title) {
  // Basic heuristic: use first comma chunk as Wikipedia title.
  const main = (title || "").split(",")[0]?.trim();
  if (!main) return null;

  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(main)}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.extract) return null;
  return {
    title: data.title,
    extract: data.extract,
    url: data?.content_urls?.desktop?.page || null
  };
}
