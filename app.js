/* Core Leaflet app */
const map = L.map('map', {
  zoomControl: true,
  minZoom: 2,
});

// Satellite with street names: Esri World Imagery (satellite) + label-only overlay (CartoDB)
const esri = L.tileLayer.provider('Esri.WorldImagery');
// Label-only overlay (no API key). If this ever changes, swap to 'Stadia.AlidadeSmooth' (requires key).
const labels = L.tileLayer.provider('CartoDB.PositronOnlyLabels');

const streets = L.tileLayer.provider('OpenStreetMap.Mapnik'); // optional base to compare
const baseLayers = {
  "Esri World Imagery": esri,
  "OpenStreetMap": streets
};
const overlays = {
  "Labels": labels
};

esri.addTo(map);
labels.addTo(map);
L.control.layers(baseLayers, overlays, { collapsed: true }).addTo(map);
L.control.scale().addTo(map);

let featureLayer;
let featureIndex = []; // for search

function getColorByCuts(cuts) {
  if (cuts === 18) return '#3a86ff'; // blue
  if (cuts === 15) return '#3bb273'; // green
  return '#6c7785'; // gray
}

function makeStyle(props) {
  const cuts = Number(props.CutsPerYear ?? props.cuts ?? props.cuts_per_year);
  return {
    color: getColorByCuts(cuts),
    weight: 2,
    opacity: 1,
    fillOpacity: 0.25,
    fillColor: getColorByCuts(cuts)
  };
}

// Label marker
function centerOf(feature) {
  // compute a centroid-ish point for polygons; fallback to geometry coords for points
  try {
    if (feature.geometry.type === 'Point') return L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
    // For polygon, approximate centroid using Leaflet bounds
    const layer = L.geoJSON(feature);
    return layer.getBounds().getCenter();
  } catch (e) {
    return null;
  }
}

function labelFor(props) {
  return props.UniqueID || props.unique_id || props.id || props.UID || '';
}

function buildPopup(props) {
  const uid = labelFor(props);
  const name = props.Name || props.name || '';
  const cuts = props.CutsPerYear ?? props.cuts ?? props.cuts_per_year ?? '—';
  const extra = Object.entries(props)
    .filter(([k]) => !['UniqueID','unique_id','id','UID','Name','name','CutsPerYear','cuts','cuts_per_year'].includes(k))
    .slice(0, 8)
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
    .join('');
  return `
    <div>
      <div style="font-weight:700;font-size:14px;margin-bottom:4px">${uid} ${name ? '– ' + name : ''}</div>
      <table class="popup-table">
        <tr><td><b>Cuts/Year</b></td><td>${cuts}</td></tr>
        ${extra}
      </table>
    </div>
  `;
}

function addLabel(feature) {
  const c = centerOf(feature);
  const uid = labelFor(feature.properties || {});
  if (!c || !uid) return null;
  const icon = L.divIcon({
    className: 'label-pill',
    html: uid
  });
  return L.marker(c, { icon, interactive: false });
}

function prepareIndex(feature, layer) {
  const props = feature.properties || {};
  const uid = String(labelFor(props));
  const name = String(props.Name || props.name || '');
  featureIndex.push({
    uid,
    uidBare: uid.replace(/^[A-Za-z]+/, ''), // strip any prefix letters (e.g., M0123 -> 0123)
    name,
    layer,
    bounds: layer.getBounds ? layer.getBounds() : (layer.getLatLng ? L.latLngBounds(layer.getLatLng(), layer.getLatLng()) : null),
  });
}

async function loadData() {
  const res = await fetch('data/data.geojson', { cache: 'no-store' });
  const gj = await res.json();

  const labelMarkers = [];
  featureLayer = L.geoJSON(gj, {
    style: f => makeStyle(f.properties || {}),
    pointToLayer: (feature, latlng) => {
      const props = feature.properties || {};
      return L.circleMarker(latlng, {
        radius: 6,
        color: makeStyle(props).color,
        weight: 2,
        fillColor: makeStyle(props).fillColor,
        fillOpacity: 0.5
      });
    },
    onEachFeature: (feature, layer) => {
      // popup
      layer.bindPopup(buildPopup(feature.properties || {}));
      // label
      const label = addLabel(feature);
      if (label) labelMarkers.push(label);
      // index for search
      prepareIndex(feature, layer);
    }
  }).addTo(map);

  // Add labels as a separate layer
  const labelsLayer = L.layerGroup(labelMarkers).addTo(map);

  // Fit to data
  try {
    map.fitBounds(featureLayer.getBounds(), { padding: [20, 20] });
  } catch (e) {
    map.setView([-27.5, 153.15], 11); // SE QLD fallback
  }
}

// Smart search: accepts "M0123" or "0123" or partial "123"
function searchFeatures(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  return featureIndex.filter(entry => {
    const uid = entry.uid?.toLowerCase() || '';
    const uidBare = entry.uidBare?.toLowerCase() || '';
    const name = entry.name?.toLowerCase() || '';
    // contains match on any of them
    return uid.includes(q) || uidBare.includes(q) || name.includes(q);
  }).slice(0, 200);
}

// render results
function renderResults(list) {
  const resultsEl = document.getElementById('results');
  resultsEl.innerHTML = '';
  if (!list.length) {
    resultsEl.innerHTML = '<div class="muted">No matches.</div>';
    return;
  }
  for (const item of list) {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.innerHTML = `
      <div class="uid">${item.uid || '(no UID)'}</div>
      <div class="name">${item.name || ''}</div>
    `;
    div.addEventListener('click', () => {
      if (item.bounds) {
        map.fitBounds(item.bounds.pad(0.2));
      }
      if (item.layer && item.layer.openPopup) {
        item.layer.openPopup();
      }
    });
    resultsEl.appendChild(div);
  }
}

document.getElementById('clearBtn').addEventListener('click', () => {
  document.getElementById('searchBox').value = '';
  renderResults([]);
});

document.getElementById('searchBox').addEventListener('input', (e) => {
  const q = e.target.value;
  const matches = searchFeatures(q);
  renderResults(matches);
  if (matches.length === 1) {
    // auto-zoom to single match
    const only = matches[0];
    if (only.bounds) {
      map.fitBounds(only.bounds.pad(0.2));
    }
    if (only.layer && only.layer.openPopup) {
      only.layer.openPopup();
    }
  }
});

loadData();
