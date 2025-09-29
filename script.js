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











// ====== Parks Sidebar (Zones) with custom start IDs, proximity order, notes, admin CSV ======
(function(){
  if (typeof map === 'undefined') { console.error('Map is not defined. Ensure your map initializes window.map.'); return; }

  const ADMIN_PASSWORD = 'Fishing101!';
  const START_IDS = {
    "1": "M0123",
    "2": "M0442",
    "3": "M0221",
    "4": "M0700",
    "5": "M0766"
  };

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

  function saveState(id, state) { localStorage.setItem('park_' + id, JSON.stringify(state)); }
  function loadState(id) { let s = localStorage.getItem('park_' + id); return s ? JSON.parse(s) : { checked:false, note:'', lastUpdated:'' }; }
  function todayISO() { const d=new Date(); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
  function distance(a,b){return a.distanceTo(b);}

  function orderByProximity(items, zoneKey) {
    if (items.length <= 2) return items;
    items.forEach(it => { it._center = it.layer.getBounds().getCenter(); });
    let startIdx = 0;
    const preferred = START_IDS[zoneKey];
    if (preferred) {
      const found = items.findIndex(it => it.id === preferred);
      if (found >= 0) startIdx = found;
    }
    const ordered = [];
    const remaining = items.slice();
    let current = remaining.splice(startIdx,1)[0];
    ordered.push(current);
    while (remaining.length) {
      let bestJ=0,bestD=Infinity;
      for (let j=0;j<remaining.length;j++) {
        const d=distance(current._center, remaining[j]._center);
        if(d<bestD){bestD=d;bestJ=j;}
      }
      current=remaining.splice(bestJ,1)[0];
      ordered.push(current);
    }
    ordered.forEach(it => { delete it._center; });
    return ordered;
  }

  fetch('data.geojson')
    .then(res => res.json())
    .then(data => {
      const catchments = {};

      const geoLayer = L.geoJSON(data, {
        style: function(feature) {
          try {
            const desc = feature.properties && feature.properties.description && feature.properties.description.value;
            const fields = desc ? parseDescriptionTable(desc) : {};
            const cpy = parseInt(fields['CutsPerYear'] || '0', 10);
            let color = '#808080';
            if (cpy === 18) color = '#1f77b4';
            else if (cpy === 15) color = '#2ca02c';
            return { color: color, weight: 2, fillOpacity: 0.4 };
          } catch(e) { return { color:'#808080', weight:2, fillOpacity:0.4 }; }
        },
        onEachFeature: function(feature, layer) {
          const desc = feature.properties && feature.properties.description && feature.properties.description.value;
          const fields = desc ? parseDescriptionTable(desc) : {};
          const catchment = fields['OSS_CATCHMENT'] || 'Unassigned';
          const mowingID = fields['MowingID'] || feature.properties.name || 'Unknown';
          const name = fields['Name'] || '';
          const label = mowingID + (name ? ' – ' + name : '');
          const zoneLabel = /^\d+$/.test(catchment) ? `Zone ${catchment}` : `Zone ${catchment}`;

          if (!catchments[catchment]) catchments[catchment] = [];
          catchments[catchment].push({ id: mowingID, name: name, label: label, layer: layer, zone: zoneLabel, catchment: catchment });
          layer.bindPopup('<b>'+label+'</b><br>'+zoneLabel);
        }
      }).addTo(map);

      const sidebarRoot = document.getElementById('catchmentList');
      sidebarRoot.innerHTML = '';
      const keys = Object.keys(catchments).sort((a,b)=>parseFloat(a)-parseFloat(b));

      // Build sidebar lists
      keys.forEach(k => {
        const items = catchments[k];
        const ordered = orderByProximity(items.slice(), k);

        const section = document.createElement('div');
        section.className = 'catchment-section';
        const title = document.createElement('div');
        title.className = 'catchment-title';
        const zoneTitle = /^\d+$/.test(k) ? `Zone ${k}` : `Zone ${k}`;
        title.textContent = zoneTitle;
        const list = document.createElement('ul');
        list.className = 'park-list';

        ordered.forEach(it => {
          const li = document.createElement('li');
          let state = loadState(it.id);
          const cb = document.createElement('input');
          cb.type='checkbox'; cb.checked=!!state.checked;
          cb.addEventListener('change',()=>{state.checked=cb.checked;state.lastUpdated=todayISO();saveState(it.id,state);});
          li.appendChild(cb);
          const span=document.createElement('span');
          span.textContent=it.label; span.style.cursor='pointer';
          span.addEventListener('click',()=>{if(it.layer.getBounds)map.fitBounds(it.layer.getBounds(),{padding:[20,20]});if(it.layer.openPopup)it.layer.openPopup();});
          li.appendChild(span);
          const note=document.createElement('input');
          note.type='text'; note.placeholder='Add note'; note.value=state.note||'';
          note.addEventListener('change',()=>{state.note=note.value;state.lastUpdated=todayISO();saveState(it.id,state);});
          li.appendChild(note);
          list.appendChild(li);
        });

        title.addEventListener('click',()=>{list.style.display=(list.style.display==='none'||!list.style.display)?'block':'none';});
        section.appendChild(title); section.appendChild(list);
        sidebarRoot.appendChild(section);
      });

      // Admin-protected grouped CSV export
      function buildCsv(){
        const header=['Zone','MowingID','Name','Checked','Note','LastUpdated'];
        const rows=[header];
        keys.forEach(k => {
          const ordered = orderByProximity(catchments[k].slice(), k);
          ordered.forEach(it=>{
            const st=loadState(it.id);
            rows.push([it.zone,it.id,it.name||'',st.checked?'Yes':'No',(st.note||'').replace(/[\r\n]+/g,' '),st.lastUpdated||'']);
          });
        });
        return rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
      }

      const exportBtn=document.getElementById('exportCsvBtn');
      if(exportBtn){
        exportBtn.addEventListener('click',()=>{
          const pwd=prompt('Admin password required to export CSV:');
          if(pwd!==ADMIN_PASSWORD){alert('Incorrect password.');return;}
          const csv=buildCsv();
          const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
          const url=URL.createObjectURL(blob);
          const a=document.createElement('a');
          const d=new Date();
          const p=n=>String(n).padStart(2,'0');
          const fname=`parks_status_${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}.csv`;
          a.href=url; a.download=fname;
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(url);
        });
      }
    })
    .catch(err=>{console.error('Failed to load data.geojson:',err);});
})(); 
// ====== End Parks Sidebar ======
