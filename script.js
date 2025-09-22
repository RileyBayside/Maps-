var map = L.map('map').setView([-27.55, 153.2], 12);

// Base layers
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
});

var esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
}).addTo(map);

var baseMaps = {
    "OpenStreetMap": osm,
    "Esri Satellite": esri
};

L.control.layers(baseMaps).addTo(map);

var geojsonLayer;
var featureIndex = {};

// Define color by CutsPerYear property
function getColor(cuts) {
    switch(cuts) {
        case 18: return 'blue';
        case 15: return 'green';
        case 12: return 'orange';
        case 10: return 'purple';
        default: return 'red';
    }
}

// Load GeoJSON
fetch('data.geojson')
  .then(res => res.json())
  .then(data => {
    geojsonLayer = L.geoJSON(data, {
        style: function(feature) {
            var cuts = feature.properties.CutsPerYear || 0;
            return {
                color: getColor(cuts),
                weight: 2,
                fillOpacity: 0.2
            };
        },
        onEachFeature: function (feature, layer) {
            if (feature.properties && feature.properties.name) {
                var popupText = feature.properties.name;
                if (feature.properties.CutsPerYear) {
                    popupText += " (" + feature.properties.CutsPerYear + " cuts/yr)";
                }
                layer.bindPopup(popupText);
                featureIndex[feature.properties.name.toLowerCase()] = layer;
            }
        }
    }).addTo(map);
  });

// Custom substring search
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
