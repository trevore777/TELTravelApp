export async function getAmadeusToken() {
  const env = process.env.AMADEUS_ENV || "test";
  const base = env === "production" ? "https://api.amadeus.com" : "https://test.api.amadeus.com";

  const id = process.env.AMADEUS_CLIENT_ID;
  const secret = process.env.AMADEUS_CLIENT_SECRET;

  if (!id || !secret) {
    throw new Error("Missing AMADEUS_CLIENT_ID/AMADEUS_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: id,
    client_secret: secret,
  });

  const r = await fetch(`${base}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Amadeus token error ${r.status}: ${text}`);
  }

  const json = await r.json();
  return { base, accessToken: json.access_token };
}
