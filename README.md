# SCHED Replica (Final)

Replica of the [tresseisjoel52/SCHED](https://github.com/tresseisjoel52/SCHED) repository.

## Features
- Default Esri Satellite map (with option to switch to OpenStreetMap)
- Loads features from `data.geojson` (convert from KMZ using `convert_kmz.py`)
- Popups show feature names
- Search functionality:
  - Geocoder box (top-left)
  - Custom ID substring search (type e.g. "123" to find "M0123")
- Extra HTML pages: `SiteFind.html`, `ffzsf_map_app.html`

## How to Update Data
1. Place your `.kmz` file in the folder.
2. Run:
   ```bash
   python convert_kmz.py yourfile.kmz
   ```
   This will overwrite `data.geojson`.
3. Reload the site (or push to GitHub Pages).

## Usage
Open `SiteFind.html` or `ffzsf_map_app.html` in a browser, or deploy with GitHub Pages.
