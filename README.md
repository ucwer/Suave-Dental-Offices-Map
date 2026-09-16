# Suave Dental Office Finder

A static, responsive office map with eight owner-confirmed offices, fifteen starting locations, searchable contacts, road-distance/time rankings and Google Maps directions.

## Run locally

Use any static HTTP server from the repository root, e.g. `python -m http.server 8765`, and open http://localhost:8765. No build or runtime package installation is required. Serve over HTTP/HTTPS, not a `file://` URL, because the app loads JSON data and JavaScript modules.

## Maintain

- `data/locations.json`: single source of office addresses, phone/fax numbers, coordinates and city reference points.
- `data/routes.json`: dated OSRM road estimates for every origin/office pair.
- `scripts/refresh-routes.py`: regenerate the snapshot using Python 3 and curl. It fails before overwriting if any route is missing. Run after changing coordinates or adding locations.
- `app.js`: UI, map state, cancellation, retry and fallback behavior.
- `routing.js`: route validation, ranking, conversion and provider URLs.
- `styles.css`: desktop and mobile layout.
- `ACCURACY.md`: sources, corrections and limitations.

Run `npm test` (Node.js 18+) for data integrity and routing regression checks. No API key is embedded or required. Public road estimates do not include live traffic; open Google Maps for current travel information.
