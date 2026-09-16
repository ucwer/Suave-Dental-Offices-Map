# Location and routing review — September 16, 2026

## Authoritative office contacts

All eight addresses and phone numbers follow the office directory supplied by the owner during this review. This overrides public website differences (especially Los Banos' central booking number). Modesto and Livingston fax numbers are also included. Cross-street descriptions are not used as routing endpoints; the full street address is used instead.

West Sacramento remains an office: the owner confirmed its details, resolving conflicting seven/eight-location text on the public website.

## Pin positions

The previous file used city-level coordinates for several offices. Every office now uses a score-100 PointAddress match from Esri's World Geocoding service. These are address locations, not a guarantee of the exact parking entrance or suite doorway. Independent U.S. Census street-range geocoding corroborates all eight office addresses. Raw responses are saved in `data/address-evidence.json` and `data/geocoding-evidence.json`.

The old Stockton pin was approximately 4.6 miles from the matched address; Modesto was approximately 2.3 miles away. All office origins are derived from the same office records, eliminating duplicate coordinate definitions.

Sources:

- [Suave Dental office listings](https://suavedental.net/locations/) and its individual location pages, recorded on each office in `data/locations.json`.
- [Yolo County dental directory](https://www.yolocounty.gov/government/general-government-departments/health-human-services/families/oral-health/free-or-low-cost-dental-care) corroborates West Sacramento.
- [U.S. Census geocoder](https://geocoding.geo.census.gov/).
- [Esri World Geocoding service](https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer).

## Starting cities

Manteca and Patterson are **starting cities**, not new dental offices. Their reference points are City Hall, supported by the [City of Manteca](https://www.manteca.gov/) (1001 W Center Street) and [City of Patterson](https://www.pattersonca.gov/) (1 Plaza). The existing Davis, Fresno, Sacramento Central, Tracy and Turlock points remain approximate city-center references and are labeled accordingly; they are not verified patient addresses.

Google Maps links pass the same starting coordinates used in the estimate and the complete office destination address, including city, state, ZIP and suite when provided. Change the starting address in Google Maps for patient-specific directions.

## Driving estimates

Removed the unsourced hard-coded matrix. Examples of conflicting old entries included Modesto–Livingston (25 vs 34.5 miles in opposite directions) and Stockton–Livingston (58.5 vs 68 miles). Directional differences can be legitimate, but these values had no route provenance.

The new file contains 120 directional estimates calculated by [OSRM](https://project-osrm.org/) using OpenStreetMap roads. Distances are meters converted to miles; durations are seconds rounded to minutes. These represent the routing engine's recommended routes, not guaranteed shortest-mile routes. Time excludes live traffic, departure-time effects, parking, and check-in. Estimates can differ from Google Maps. No straight-line distance is presented as a driving distance.

The saved snapshot's actual retrieval time is recorded in `data/routes.json`. Refresh uses a single table request for the selected origin and all eight offices. Unreachable destinations are excluded from rankings, never converted to zero. The starting office is correctly eligible at zero miles. Selected route geometry loads on demand and is cached in memory.

If routing is unavailable, the UI retains the dated saved estimates and Google Maps links, explicitly reports the failure, and does not invent distances or draw a straight line as a road route. A failed map dependency does not prevent the directory and route comparisons from working.

## Operational limitations

The public OSRM service has no application-specific uptime guarantee and no live traffic feed. For higher-volume production usage, configure a managed or self-hosted OSRM-compatible service in `routing.js` and `scripts/refresh-routes.py`. The map requires an internet connection for Esri tiles and the Leaflet CDN. Routing calls transmit only the predefined public location coordinates; this app has no patient-address field.
