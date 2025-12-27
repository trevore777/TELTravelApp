# Travel Journal Web (Leaflet + localStorage + AI on Vercel)

## Features
- Trips + Steps saved in localStorage
- Leaflet map with pins and route polyline
- Timeline/journal view
- Share via URL payload
- Export via print-to-PDF page
- AI assistant via serverless endpoint (/api/ai)

## Run locally
Use any static server. Examples:
- VS Code Live Server
- `python -m http.server`

For AI to work locally, you'll need a local serverless equivalent or deploy to Vercel.

## Deploy on Vercel
1. Push this repo to GitHub
2. Import into Vercel
3. Add Environment Variables:
   - OPENAI_API_KEY
   - OPENAI_MODEL (optional)
4. Deploy

## Notes
- Photos stored in localStorage as Data URLs can be large. Use only a few small images for demos.
- Nominatim has rate limits; place search is debounced.
- AI provides options and planning; it does not perform bookings or payments.
