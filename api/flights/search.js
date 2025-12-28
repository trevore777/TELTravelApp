import { getAmadeusToken } from "../amadeus/token.js";

function simplifyOffer(offer) {
  const price = offer?.price?.total ? Number(offer.price.total) : null;
  const currency = offer?.price?.currency || "USD";

  const itineraries = (offer.itineraries || []).map(it => {
    const segments = (it.segments || []).map(seg => ({
      from: seg?.departure?.iataCode,
      to: seg?.arrival?.iataCode,
      departAt: seg?.departure?.at,
      arriveAt: seg?.arrival?.at,
      carrier: seg?.carrierCode,
      number: seg?.number,
      duration: seg?.duration,
      stops: (seg?.numberOfStops ?? 0),
    }));
    return {
      duration: it?.duration,
      segments,
      stopsTotal: Math.max(0, segments.length - 1),
    };
  });

  return {
    id: offer.id,
    price,
    currency,
    oneWay: offer.oneWay ?? null,
    validatingAirlineCodes: offer.validatingAirlineCodes || [],
    itineraries
  };
}

export default async function handler(req, res) {
  try {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      adults = "1",
      nonStop = "false",
      currencyCode,
      max = "15",
    } = req.query;

    if (!origin || !destination || !departureDate) {
      return res.status(400).json({ error: "origin, destination, departureDate are required" });
    }

    const { base, accessToken } = await getAmadeusToken();

    const qs = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      adults: String(adults),
      nonStop: String(nonStop),
      max: String(max),
    });

    if (returnDate) qs.set("returnDate", returnDate);
    if (currencyCode) qs.set("currencyCode", currencyCode);

    const url = `${base}/v2/shopping/flight-offers?${qs.toString()}`;

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: `Amadeus error ${r.status}`, details: text });
    }

    const json = await r.json();
    const offers = (json.data || []).map(simplifyOffer);

    res.status(200).json({ offers });
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
}
