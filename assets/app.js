// Basic Leaflet app with satellite base + street labels overlay
const map = L.map('map', {
  zoomControl: true,
  preferCanvas: true
}).setView([-27.4698, 153.0251], 12); // Brisbane default

// Basemap: Esri WorldImagery (satellite)
const imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
}).addTo(map);

// Labels-only overlay (Carto)
const labelsPane = map.createPane('labels');
labelsPane.classList.add('leaflet-labels-pane');
const labels = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
  pane: 'labels',
  attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20
}).addTo(map);

// Utilities to pull fields from the KML->GeoJSON 'description' HTML table
function parseFieldsFromDescription(descObj) {
  try {
    const html = typeof descObj === 'object' ? (descObj.value ?? '') : (descObj ?? '');
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const rows = tmp.querySelectorAll('tr');
    const out = {};
    rows.forEach((tr, idx) => {
      const tds = tr.querySelectorAll('td,th');
      if (tds.length >= 2 && idx > 0) {
        const key = tds[0].textContent.trim();
        const val = tds[1].textContent.trim();
        out[key] = val;
      }
    });
    return out;
  } catch (e) {
    return {};
  }
}

function colorForCuts(cuts) {
  const n = Number(cuts);
  if (n === 18) return '#1f78b4'; // blue
  if (n === 15) return '#33a02c'; // green
  if (n === 12) return '#ff7f00'; // orange
  if (n === 10) return '#e31a1c'; // red
  return '#6a3d9a'; // purple for other
}

const sitesLayer = L.geoJSON(null, {
  style: (feature) => {
    const fields = parseFieldsFromDescription(feature.properties?.description);
    const cuts = fields['CutsPerYear'] ?? feature.properties?.CutsPerYear ?? null;
    const col = colorForCuts(cuts);
    return {
      color: '#111827',
      weight: 0.8,
      opacity: 0.6,
      fillColor: col,
      fillOpacity: 0.35
    };
  },
  onEachFeature: (feature, layer) => {
    const fields = parseFieldsFromDescription(feature.properties?.description);
    const mowingId = fields['MowingID'] ?? feature.properties?.MowingID ?? feature.properties?.name ?? 'Unknown';
    const cuts = fields['CutsPerYear'] ?? feature.properties?.CutsPerYear ?? 'N/A';
    const name = fields['Name'] ?? feature.properties?.name ?? '';
    const areaType = fields['AreaType'] ?? '';
    const html = `
      <div>
        <div><strong>${mowingId}</strong> ${name ? '· ' + name : ''}</div>
        <div class="small">Cuts/Year: ${cuts}${areaType ? ' · ' + areaType : ''}</div>
      </div>
    `;
    layer.bindPopup(html);

    // Add a permanent label at centroid with the MowingID
    try {
      const centroid = turf.centerOfMass(feature);
      const c = centroid.geometry.coordinates;
      const marker = L.marker([c[1], c[0]], {
        interactive: false
      }).addTo(map);
      marker.bindTooltip(mowingId, {
        permanent: true,
        direction: 'center',
        className: 'mowingid-label'
      }).openTooltip();
    } catch (e) {
      // ignore
    }
  }
}).addTo(map);

// Load GeoJSON
fetch('./data/sites.geojson')
  .then(r => r.json())
  .then(geojson => {
    sitesLayer.addData(geojson);
    try {
      map.fitBounds(sitesLayer.getBounds(), { padding: [20, 20] });
    } catch (e) {
      // If bounds fail (no features), ignore
    }
  });

// Search
const form = document.getElementById('searchForm');
const input = document.getElementById('query');
const resultsEl = document.getElementById('results');

function normalizeIdForSearch(s) {
  if (!s) return '';
  return s.toString().trim().toUpperCase();
}

function digitsOnly(s) {
  return (s || '').toString().replace(/\D+/g, '');
}

function searchFeatures(q) {
  const matches = [];
  const qNorm = normalizeIdForSearch(q);
  const qDigits = digitsOnly(qNorm);

  sitesLayer.eachLayer(layer => {
    const f = layer.feature;
    const fields = parseFieldsFromDescription(f.properties?.description);
    const mowingId = normalizeIdForSearch(fields['MowingID'] ?? f.properties?.MowingID ?? f.properties?.name ?? '');
    const mowingDigits = digitsOnly(mowingId);

    let ok = false;
    if (qDigits.length > 0) {
      // numeric fuzzy: "123" matches "M0123"
      ok = mowingDigits.includes(qDigits);
    } else {
      ok = mowingId.includes(qNorm);
    }
    if (ok) {
      matches.push({ layer, feature: f, mowingId });
    }
  });
  return matches;
}

function renderResults(items) {
  resultsEl.innerHTML = '';
  if (!items.length) {
    resultsEl.innerHTML = '<div class="small">No matches.</div>';
    return;
  }
  items.slice(0, 50).forEach(({layer, feature, mowingId}) => {
    const fields = parseFieldsFromDescription(feature.properties?.description);
    const name = fields['Name'] ?? feature.properties?.name ?? '';
    const cuts = fields['CutsPerYear'] ?? 'N/A';
    const el = document.createElement('div');
    el.className = 'result';
    el.innerHTML = `<div class="id">${mowingId}</div><div class="small">${name} · Cuts: ${cuts}</div>`;
    el.addEventListener('click', () => {
      try {
        map.fitBounds(layer.getBounds(), { padding: [30, 30] });
        layer.openPopup();
      } catch (e) {
        // if not a polygon
        const b = layer.getLatLng ? L.latLngBounds([layer.getLatLng()]) : null;
        if (b) map.fitBounds(b);
      }
    });
    resultsEl.appendChild(el);
  });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = input.value;
  const matches = searchFeatures(q);
  renderResults(matches);
  if (matches.length) {
    // zoom to first
    const { layer } = matches[0];
    try {
      map.fitBounds(layer.getBounds(), { padding: [30, 30] });
      layer.openPopup();
    } catch (e) {}
  }
});

// simple live results on typing
input.addEventListener('input', () => {
  const q = input.value;
  if (!q || q.length < 2) {
    resultsEl.innerHTML = '';
    return;
  }
  const matches = searchFeatures(q);
  renderResults(matches);
});
