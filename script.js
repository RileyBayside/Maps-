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
    // blue for 18, green for 15, else red
    if (cuts == 18) return 'blue';
    if (cuts == 15) return 'green';
    return 'red';
}


// --- Helper getters for robust parsing ---
function getProp(obj, keys) {
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (obj && obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") {
            return obj[k];
        }
    }
    return null;
}

function getCuts(feature) {
    var p = feature.properties || {};
    var cuts = getProp(p, ['CutsPerYear','cuts_per_year','cpy','CPY','cutsPerYear']);
    if (cuts === null && p.description && p.description.value) {
        var m = p.description.value.match(/CutsPerYear<\/td><td>(\d+)<\/td>/);
        if (m) cuts = parseInt(m[1], 10);
    }
    cuts = parseInt(cuts, 10);
    if (isNaN(cuts)) cuts = 0;
    return cuts;
}

function getMowID(feature) {
    var p = feature.properties || {};
    var id = getProp(p, ['ID','MowingID','id','site_id','siteId','name']);
    if (!id && p.description && p.description.value) {
        var m = p.description.value.match(/MowingID<\/td><td>(.*?)<\/td>/);
        if (m) id = m[1];
    }
    return id ? String(id) : '';
}
// Load GeoJSON

// Load GeoJSON
fetch('data.geojson')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
        style: function(feature) {
            var cuts = getCuts(feature);
            return {
                color: getColor(cuts),
                weight: 2,
                fillOpacity: 0.25
            };
        },
        pointToLayer: function (feature, latlng) {
            var cuts = getCuts(feature);
            return L.circleMarker(latlng, {
                radius: 6,
                color: getColor(cuts),
                weight: 2,
                fillOpacity: 0.9
            });
        },
        onEachFeature: function (feature, layer) {
            var name = (feature.properties && feature.properties.name) || '';
            var mowID = getMowID(feature);
            var cuts = getCuts(feature);
            var popupText = name;
            if (mowID) popupText += " (" + mowID + ")";
            if (cuts) popupText += " - " + cuts + " cuts/yr";
            layer.bindPopup(popupText);
            if (mowID) featureIndex[mowID.toLowerCase()] = layer;
            // Optional label at high zoom
            if (name) {
                layer.bindTooltip(name, {permanent:false, direction:'top', className:'feature-label'});
                labelLayers.push(layer);
            }
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
