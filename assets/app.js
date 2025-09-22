// Initialize map
const map = L.map('map', {
  zoomControl: true,
  preferCanvas: true
}).setView([-27.4698, 153.0251], 12);

// --- Basemaps ---

// Esri Satellite Imagery
const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}',
  {
    attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 20
  }
);

// Carto Light (streets map)
const streets = L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }
);

// Carto Labels-only overlay
const labels = L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
  {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }
);

// --- Default view: Satellite + Labels ---
satellite.addTo(map);
labels.addTo(map);

// --- Layer control ---
const baseMaps = {
  "Satellite": satellite,
  "Streets": streets
};
const overlayMaps = {
  "Labels": labels
};
L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

// --- Utilities ---
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
  if (n === 18) return '#1f78b4';
  if (n === 15) return '#33a02c';
  if (n === 12) return '#ff7f00';
  if (n === 10) return '#e31a1c';
  return '#6a3d9a';
}

// --- Sites Layer ---
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
    const html = `<div><strong>${mowingId}</strong> ${name ? '· ' + name : ''}</div><div class="small">Cuts/Year: ${cuts}${areaType ? ' · ' + areaType : ''}</div>`;
    layer.bindPopup(html);
    try {
      const centroid = turf.centerOfMass(feature);
      const c = centroid.geometry.coordinates;
      const marker = L.marker([c[1], c[0]], { interactive: false }).addTo(map);
      marker.bindTooltip(mowingId, { permanent: true, direction: 'center', className: 'mowingid-label' }).openTooltip();
    } catch (e) {}
  }
}).addTo(map);

// --- Load Data ---
fetch('./data/sites.geojson')
  .then(r => r.json())
  .then(geojson => {
    sitesLayer.addData(geojson);
    try { map.fitBounds(sitesLayer.getBounds(), { padding: [20, 20] }); } catch (e) {}
  });

// --- Search ---
const form = document.getElementById('searchForm');
const input = document.getElementById('query');
const resultsEl = document.getElementById('results');

function normalizeIdForSearch(s) { return s ? s.toString().trim().toUpperCase() : ''; }
function digitsOnly(s) { return (s || '').toString().replace(/\D+/g, ''); }

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
      ok = mowingDigits.includes(qDigits);
    } else {
      ok = mowingId.includes(qNorm);
    }
    if (ok) matches.push({ layer, feature: f, mowingId });
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
    const { layer } = matches[0];
    try {
      map.fitBounds(layer.getBounds(), { padding: [30, 30] });
      layer.openPopup();
    } catch (e) {}
  }
});

input.addEventListener('input', () => {
  const q = input.value;
  if (!q || q.length < 2) {
    resultsEl.innerHTML = '';
    return;
  }
  const matches = searchFeatures(q);
  renderResults(matches);
});
