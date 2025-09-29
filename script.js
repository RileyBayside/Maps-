var map = L.map('map').setView([-27.55, 153.2], 12);

// Base layers
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
});

// Google Hybrid (satellite + street names)
var googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    attribution: 'Imagery © Google',
    maxZoom: 20
}).addTo(map);

var baseMaps = {
    "OpenStreetMap": osm,
    "Google Hybrid": googleHybrid
};

L.control.layers(baseMaps).addTo(map);

var featureIndex = {};
var labelLayers = []; // store label tooltips

// Define color by CutsPerYear property
function getColor(cuts) {
    if (cuts == 18) return 'blue';
    if (cuts == 15) return 'green';
    return 'red';
}

// Load GeoJSON
fetch('data.geojson')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
        style: function(feature) {
            var cuts = 0;
            if (feature.properties && feature.properties.description) {
                var desc = feature.properties.description.value;
                var match = desc.match(/CutsPerYear<\/td><td>(\d+)<\/td>/);
                if (match) cuts = parseInt(match[1]);
            }
            return {
                color: getColor(cuts),
                weight: 2,
                fillOpacity: 0.2
            };
        },
        onEachFeature: function (feature, layer) {
            var name = feature.properties.name || '';
            var mowID = '';
            var cuts = '';
            if (feature.properties && feature.properties.description) {
                var desc = feature.properties.description.value;
                var idMatch = desc.match(/MowingID<\/td><td>(.*?)<\/td>/);
                if (idMatch) mowID = idMatch[1];
                var cutMatch = desc.match(/CutsPerYear<\/td><td>(\d+)<\/td>/);
                if (cutMatch) cuts = cutMatch[1];
            }
            var popupText = name;
            if (mowID) popupText += " (" + mowID + ")";
            if (cuts) popupText += " - " + cuts + " cuts/yr";
            layer.bindPopup(popupText);
            if (mowID) {
                var tooltip = layer.bindTooltip(mowID, {
                    permanent: true,
                    direction: 'center',
                    className: 'mowing-id-label'
                });
                labelLayers.push(tooltip);
            }
            if (mowID) featureIndex[mowID.toLowerCase()] = layer;
        }
    }).addTo(map);
  });

// Manage label visibility by zoom level
map.on('zoomend', function() {
    var currentZoom = map.getZoom();
    labelLayers.forEach(function(layer) {
        if (currentZoom >= 15) {
            layer.openTooltip();
        } else {
            layer.closeTooltip();
        }
    });
});

// Search box
var searchBox = L.control({position: 'topleft'});
searchBox.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'search-box');
    div.innerHTML = '<input type="text" id="customSearch" placeholder="Search ID..." style="padding:4px;width:120px;">';
    return div;
};
searchBox.addTo(map);

document.addEventListener('keyup', function(e) {
    if (e.target && e.target.id === 'customSearch') {
        var query = e.target.value.toLowerCase();
        if (query.length > 1) {
            for (var key in featureIndex) {
                if (key.includes(query)) {
                    map.fitBounds(featureIndex[key].getBounds());
                    featureIndex[key].openPopup();
                    break;
                }
            }
        }
    }
});



// ========== Sidebar by OSS Catchment with Notes & Checkboxes ==========
function parseDescriptionTable(html) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, 'text/html');
  var pairs = {};
  doc.querySelectorAll('tr').forEach(function(tr) {
    var tds = tr.querySelectorAll('td');
    if (tds.length === 2) {
      var k = tds[0].innerText.trim();
      var v = tds[1].innerText.trim();
      pairs[k] = v;
    }
  });
  return pairs;
}

// Save/load notes & checked state in localStorage
function saveState(id, state) {
  localStorage.setItem('park_' + id, JSON.stringify(state));
}
function loadState(id) {
  let s = localStorage.getItem('park_' + id);
  return s ? JSON.parse(s) : { checked: false, note: '' };
}

fetch('data.geojson')
  .then(res => res.json())
  .then(data => {
    let catchments = {};
    let geoLayer = L.geoJSON(data, {
      onEachFeature: function(feature, layer) {
        var desc = feature.properties && feature.properties.description && feature.properties.description.value;
        var fields = desc ? parseDescriptionTable(desc) : {};
        var catchment = fields['OSS_CATCHMENT'] || 'Unassigned';
        var mowingID = fields['MowingID'] || feature.properties.name || 'Unknown';
        var name = fields['Name'] || '';
        var label = mowingID + (name ? ' – ' + name : '');
        if (!catchments[catchment]) catchments[catchment] = [];
        catchments[catchment].push({ label: label, id: mowingID, layer: layer });
        layer.bindPopup('<b>' + label + '</b><br>Catchment: ' + catchment);
      }
    }).addTo(map);

    let sidebar = document.getElementById('catchmentList');
    Object.keys(catchments).sort().forEach(c => {
      let section = document.createElement('div');
      section.classList.add('catchment-section');

      let title = document.createElement('div');
      title.classList.add('catchment-title');
      title.textContent = 'Catchment ' + c;

      let list = document.createElement('ul');
      list.classList.add('park-list');

      catchments[c].forEach(f => {
        let state = loadState(f.id);
        let li = document.createElement('li');

        // checkbox
        let cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = state.checked;
        cb.style.marginRight = '6px';
        cb.addEventListener('change', () => {
          state.checked = cb.checked;
          saveState(f.id, state);
        });
        li.appendChild(cb);

        // label span
        let span = document.createElement('span');
        span.textContent = f.label;
        span.style.cursor = 'pointer';
        span.addEventListener('click', () => {
          map.fitBounds(f.layer.getBounds());
          f.layer.openPopup();
        });
        li.appendChild(span);

        // note input
        let note = document.createElement('input');
        note.type = 'text';
        note.placeholder = 'Add note';
        note.value = state.note || '';
        note.style.marginLeft = '8px';
        note.style.width = '120px';
        note.addEventListener('change', () => {
          state.note = note.value;
          saveState(f.id, state);
        });
        li.appendChild(note);

        list.appendChild(li);
      });

      title.addEventListener('click', () => {
        list.style.display = list.style.display === 'none' ? 'block' : 'none';
      });

      section.appendChild(title);
      section.appendChild(list);
      sidebar.appendChild(section);
    });
  });
// =====================================================================
