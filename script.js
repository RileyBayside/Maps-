// Initialize map
var map = L.map('map').setView([-27.55, 153.25], 12);

// Add Google Hybrid basemap
L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
  maxZoom: 20,
  subdomains: ['mt0','mt1','mt2','mt3'],
  attribution: 'Imagery © Google'
}).addTo(map);

// Function to parse HTML table string into key-value pairs
function parseDescriptionTable(html) {
  let parser = new DOMParser();
  let doc = parser.parseFromString(html, 'text/html');
  let rows = doc.querySelectorAll('tr');
  let data = {};
  rows.forEach(row => {
    let cells = row.querySelectorAll('td');
    if (cells.length === 2) {
      let key = cells[0].innerText.trim();
      let value = cells[1].innerText.trim();
      data[key] = value;
    }
  });
  return data;
}

// Load GeoJSON dynamically
fetch('data.geojson') // make sure this file is in same directory on GitHub Pages
  .then(res => res.json())
  .then(data => {
    let catchments = {};
    let geoLayer = L.geoJSON(data, {
      onEachFeature: function(feature, layer) {
        if (feature.properties && feature.properties.description) {
          let desc = feature.properties.description.value;
          let fields = parseDescriptionTable(desc);
          let catchment = fields['OSS_CATCHMENT'] || 'Unassigned';
          let mowingID = fields['MowingID'] || 'Unknown';
          let name = fields['Name'] || '';
          let label = mowingID + (name ? ' – ' + name : '');

          if (!catchments[catchment]) catchments[catchment] = [];
          catchments[catchment].push({label: label, id: mowingID, layer: layer});

          layer.bindPopup('<b>' + label + '</b><br>Catchment: ' + catchment);
        }
      }
    }).addTo(map);

    // Build Sidebar
    let sidebar = document.getElementById('catchmentList');
    Object.keys(catchments).sort().forEach(c => {
      let section = document.createElement('div');
      section.classList.add('catchment-section');

      let title = document.createElement('div');
      title.classList.add('catchment-title');
      title.textContent = 'Catchment ' + c;

      let list = document.createElement('ul');
      list.classList.add('park-list');

      catchments[c].forEach(item => {
        let li = document.createElement('li');
        li.textContent = item.label;
        li.addEventListener('click', () => {
          map.fitBounds(item.layer.getBounds());
          item.layer.openPopup();
        });
        list.appendChild(li);
      });

      // Toggle expand/collapse
      title.addEventListener('click', () => {
        list.style.display = list.style.display === 'none' ? 'block' : 'none';
      });

      section.appendChild(title);
      section.appendChild(list);
      sidebar.appendChild(section);
    });
  });