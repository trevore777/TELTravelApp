module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";

    if (!apiKey) {
      res.status(500).send("Missing OPENAI_API_KEY");
      return;
    }

    // Ensure body is parsed (Vercel usually parses JSON, but this is safer)
    const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");

    const { task, trip, step, sources } = body;

    const sys = [
      "You are a travel assistant for a travel-journal web app.",
      "You must not claim you can purchase or book anything. Provide options, decision criteria, and booking links only.",
      "Be concise, structured, and practical.",
      "If specific facts are not in the provided sources, say so and provide best-effort guidance without inventing details."
    ].join(" ");

    const { prompt, links } = buildPrompt({ task, trip, step, sources });

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: sys },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!r.ok) {
      const t = await r.text();
      res.status(r.status).send(t);
      return;
    }

    const data = await r.json();
    const text = extractText(data);

    res.status(200).json({ text, links });
  } catch (e) {
    res.status(500).send(e?.message || "Server error");
  }
};

function buildPrompt({ task, trip, step, sources }) {
  const placeLabel = step?.label || step?.title || "the selected place";
  const lat = step?.lat;
  const lng = step?.lng;

  const wiki = sources?.wikipedia
    ? `Wikipedia summary for "${sources.wikipedia.title}":\n${sources.wikipedia.extract}\nSource URL: ${sources.wikipedia.url || "(none)"}`
    : "No Wikipedia summary was available.";

  const googleFlights = `https://www.google.com/travel/flights`;
  const booking = `https://www.booking.com`;
  const airbnb = `https://www.airbnb.com`;
  const baseLinks = [googleFlights, booking, airbnb];

  const tripLine = `Trip: ${trip?.title || "Untitled"} (${trip?.startDate || "?"} to ${trip?.endDate || "?"})`;
  const stepLine = `Step: ${placeLabel} (${lat ?? "?"}, ${lng ?? "?"}) Dates: ${step?.arrivalDate || "?"} to ${step?.departureDate || "?"}`;

  if (task === "place_info") {
    return {
      prompt: [
        tripLine,
        stepLine,
        "",
        "Task: Provide a short, readable overview of this place for a travel journal entry.",
        "Use the provided Wikipedia summary if present. Do not invent facts beyond the summary.",
        "",
        "Output format:",
        "1) 120–180 word overview",
        "2) 5 bullet highlights (generic if needed)",
        "3) 3 practical tips (transport, safety, cost)",
        "",
        "Sources:",
        wiki
      ].join("\n"),
      links: sources?.wikipedia?.url ? [sources.wikipedia.url, ...baseLinks] : baseLinks
    };
  }

  if (task === "plan_days") {
    return {
      prompt: [
        tripLine,
        stepLine,
        "",
        "Task: Plan the next 2–3 days starting from this step.",
        "Ask no questions. Assume: moderate budget, mixed interests (sightseeing + food + one nature option).",
        "Include a rainy-day backup each day.",
        "",
        "Constraints:",
        "- Do not fabricate opening hours or exact ticket prices.",
        "- Keep it implementable."
      ].join("\n"),
      links: baseLinks
    };
  }

  if (task === "flight_options") {
    return {
      prompt: [
        tripLine,
        stepLine,
        "",
        "Task: Provide flight option patterns for traveling to the next destination.",
        "Because origin/destination may be missing, include:",
        "- checklist of minimum inputs needed",
        "- 4 option patterns (cheapest/fastest/best schedule/fewer stops) + decision criteria",
        "- step-by-step process for searching and booking (but do not book)",
        ""
      ].join("\n"),
      links: baseLinks
    };
  }

  if (task === "accom_options") {
    return {
      prompt: [
        tripLine,
        stepLine,
        "",
        "Task: Provide accommodation options and an approach to choosing where to stay near this step.",
        "Include:",
        "- 3–5 recommended area types and tradeoffs",
        "- 3 accommodation types and who they suit",
        "- safety + cancellation checklist",
        "Do not invent hotel names."
      ].join("\n"),
      links: baseLinks
    };
  }

  return { prompt: `${tripLine}\n${stepLine}\n\nTask: Provide concise travel help.`, links: baseLinks };
}

function extractText(data) {
  try {
    const out = data?.output || [];
    for (const item of out) {
      const content = item?.content || [];
      for (const c of content) {
        if (c?.type === "output_text" && typeof c?.text === "string") return c.text;
      }
    }
  } catch {}
  if (typeof data?.output_text === "string") return data.output_text;
  return "No text returned.";
}
