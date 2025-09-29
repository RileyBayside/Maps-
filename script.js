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


// ====== Parks Sidebar (robust creation) ======
(function(){
  if (typeof map === 'undefined') { console.error('Map is not defined.'); return; }

  const ADMIN_PASSWORD = 'Fishing101!';
  const START_IDS = { "1":"M0123","2":"M0442","3":"M0221","4":"M0700","5":"M0766" };

  function ensureSidebar() {
    let side = document.getElementById('sidebar');
    if (!side) {
      side = document.createElement('div');
      side.id = 'sidebar';
      side.innerHTML = '<h2>Parks</h2><div class="sidebar-actions"><button id="exportCsvBtn">Export CSV</button></div><div id="catchmentList"></div>';
      document.body.appendChild(side);
    } else {
      if (!document.getElementById('catchmentList')) {
        const cl = document.createElement('div'); cl.id = 'catchmentList';
        side.appendChild(cl);
      }
      if (!document.getElementById('exportCsvBtn')) {
        const act = document.createElement('div'); act.className='sidebar-actions';
        act.innerHTML = '<button id="exportCsvBtn">Export CSV</button>';
        side.insertBefore(act, side.querySelector('#catchmentList'));
      }
    }
    return {root: side, list: document.getElementById('catchmentList')};
  }

  const { list: catchmentRoot } = ensureSidebar();

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
  function saveState(id, state){ localStorage.setItem('park_'+id, JSON.stringify(state)); }
  function loadState(id){ let s = localStorage.getItem('park_'+id); return s ? JSON.parse(s) : {checked:false, note:'', lastUpdated:''}; }
  function todayISO(){ const d=new Date(), p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
  function distance(a,b){ return a.distanceTo(b); }

  function orderByProximity(items, zoneKey){
    if(items.length<=2) return items;
    items.forEach(it=>{ it._center = it.layer.getBounds().getCenter(); });
    let startIdx = 0;
    const preferred = START_IDS[zoneKey];
    if (preferred) {
      const found = items.findIndex(it => it.id === preferred);
      if (found >= 0) startIdx = found;
    }
    const ordered = []; const remaining = items.slice();
    let current = remaining.splice(startIdx,1)[0]; ordered.push(current);
    while(remaining.length){
      let bestJ=0, bestD=Infinity;
      for(let j=0;j<remaining.length;j++){
        const d = distance(current._center, remaining[j]._center);
        if(d<bestD){ bestD=d; bestJ=j; }
      }
      current = remaining.splice(bestJ,1)[0]; ordered.push(current);
    }
    ordered.forEach(it=>{ delete it._center; });
    return ordered;
  }

  fetch('data.geojson')
    .then(r => {
      if(!r.ok) throw new Error('HTTP '+r.status);
      return r.json();
    })
    .then(data => {
      const byCatch = {};
      const keys = [];

      const layer = L.geoJSON(data, {
        style: function(feature){
          try{
            const desc = feature.properties && feature.properties.description && feature.properties.description.value;
            const f = desc ? parseDescriptionTable(desc) : {};
            const cpy = parseInt(f['CutsPerYear']||'0',10);
            let color = '#808080';
            if(cpy===18) color = '#1f77b4'; else if(cpy===15) color = '#2ca02c';
            return { color, weight:2, fillOpacity:0.4 };
          }catch(e){ return { color:'#808080', weight:2, fillOpacity:0.4 }; }
        },
        onEachFeature: function(feature, lyr){
          const desc = feature.properties && feature.properties.description && feature.properties.description.value;
          const f = desc ? parseDescriptionTable(desc) : {};
          const catchment = f['OSS_CATCHMENT'] || 'Unassigned';
          const mowingID = f['MowingID'] || feature.properties.name || 'Unknown';
          const name = f['Name'] || '';
          const label = mowingID + (name ? ' – ' + name : '');
          const zoneLabel = /^\d+$/.test(catchment) ? `Zone ${catchment}` : `Zone ${catchment}`;
          if(!byCatch[catchment]) { byCatch[catchment] = []; keys.push(catchment); }
          byCatch[catchment].push({id:mowingID, name, label, layer:lyr, zone:zoneLabel});
          lyr.bindPopup('<b>'+label+'</b><br>'+zoneLabel);
        }
      }).addTo(map);

      // render lists
      catchmentRoot.innerHTML = '';
      keys.sort((a,b)=>parseFloat(a)-parseFloat(b));
      keys.forEach(k=>{
        const section = document.createElement('div'); section.className='catchment-section';
        const title = document.createElement('div'); title.className='catchment-title'; title.textContent = `Zone ${k}`;
        const list = document.createElement('ul'); list.className='park-list';

        const ordered = orderByProximity(byCatch[k].slice(), k);
        ordered.forEach((it, idx)=>{
          const li = document.createElement('li');
          const st = loadState(it.id);

          const cb = document.createElement('input'); cb.type='checkbox'; cb.checked=!!st.checked;
          cb.addEventListener('change',()=>{ st.checked = cb.checked; st.lastUpdated = todayISO(); saveState(it.id, st); });
          li.appendChild(cb);

          const span = document.createElement('span'); span.textContent = `${idx+1}. ${it.label}`; span.style.cursor='pointer';
          span.addEventListener('click',()=>{ if(it.layer.getBounds) map.fitBounds(it.layer.getBounds(), {padding:[20,20]}); if(it.layer.openPopup) it.layer.openPopup(); });
          li.appendChild(span);

          const note = document.createElement('input'); note.type='text'; note.placeholder='Add note'; note.value = st.note||'';
          note.addEventListener('change',()=>{ st.note = note.value; st.lastUpdated = todayISO(); saveState(it.id, st); });
          li.appendChild(note);

          list.appendChild(li);
        });

        title.addEventListener('click',()=>{ list.style.display = (list.style.display==='none'||!list.style.display)?'block':'none'; });
        section.appendChild(title); section.appendChild(list); catchmentRoot.appendChild(section);
      });

      // Export CSV grouped by zone with order
      function buildCsv(){
        const header=['Zone','Order','MowingID','Name','Checked','Note','LastUpdated'];
        const rows=[header];
        keys.forEach(k=>{
          const ordered = orderByProximity(byCatch[k].slice(), k);
          ordered.forEach((it, idx)=>{
            const st = loadState(it.id);
            rows.push([it.zone, idx+1, it.id, it.name||'', st.checked?'Yes':'No', (st.note||'').replace(/[\r\n]+/g,' '), st.lastUpdated||'']);
          });
        });
        return rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
      }
      const btn = document.getElementById('exportCsvBtn');
      if(btn){
        btn.addEventListener('click',()=>{
          const pwd = prompt('Admin password required to export CSV:');
          if(pwd!=='Fishing101!'){ alert('Incorrect password.'); return; }
          const csv = buildCsv();
          const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const d=new Date(), p=n=>String(n).padStart(2,'0');
          a.href=url; a.download=`parks_status_${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}.csv`;
          document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        });
      }
    })
    .catch(err => {
      console.error('Failed to load data.geojson:', err);
      // still create the panel even if data fails
      if (catchmentRoot) catchmentRoot.innerHTML = '<div style="color:#900">Could not load data.geojson. Ensure it is alongside Parks.html/script.js.</div>';
    });
})();
// ====== End Parks Sidebar ======
