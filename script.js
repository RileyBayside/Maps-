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


// ====== Parks Sidebar with Zone headers and custom Zone 1 order ======
(function(){
  if (typeof map === 'undefined') { console.error('Map is not defined.'); return; }

  const CUSTOM_ORDERS = {
    "1": [
"M0123","M0427","M0402","M0136","M0364","M0408","M0819","M0105",
"M0359","M0361","M0362","M0363","M1677","M0392","M0436","M0110",
"M0147","M0367","M0374","M0163","M0140","M1361","M0390","M0389",
"M0130","M0103","M0350","M0120","M0114","M0104","M0131","M0388",
"M0394","M0356","M01360","M0358","M0369","M0133","M0385","M0370",
"M0368","M0432","M0355","M0139","M0122","M0143","M0111","M0157",
"M0424","M0165","M0815","M0354","M0875","M0375","M0338","M0137",
"M0149","M0366","M0794","M0113","M0118","M0138","M0380","M0398",
"M0132","M0342","M0116","M0135","M0774","M0134","M0391","M0405",
"M0145","M0112","M0146","M1680","M0337","M0160","M0334","M0352",
"M0154","M0412","M0333","M0809","M0386","M0162","M0343","M0407",
"M0127","M0119","M0428","M0430","M0429","M1698","M1507","M0109",
"M0141","M0820","M0117","M0159","M0346","M0144","M0121","M0372",
"M0128","M0376","M0377","M0340","M0032","M0434","M0360","M0108",
"M0379","M1544","M0152","M0151","M0397","M0126","M0808","M0371",
"M0156","M0335","M0400","M0423","M0155","M0124","M0125","M0038",
"M0349","M0373","M0365","M0142","M0403","M0158","M0129","M0351",
"M0150","M0153","M0148","M0161","M0401"
    ]
  };

  function ensureSidebar() {
    let side = document.getElementById('sidebar');
    if (!side) {
      side = document.createElement('div');
      side.id = 'sidebar';
      side.innerHTML = '<h2>Parks</h2><div class="sidebar-actions"><button id="exportCsvBtn">Export CSV</button></div><div id="catchmentList"></div>';
      document.body.appendChild(side);
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

  function orderByCustomOrDefault(items, zoneKey){
    const custom = CUSTOM_ORDERS[zoneKey];
    if(custom){
      const mapById={}; items.forEach(it=>{ mapById[it.id]=it; });
      return custom.map(id=>mapById[id]).filter(Boolean);
    }
    return items; // fallback (default order as loaded)
  }

  fetch('data.geojson')
    .then(r=>r.json())
    .then(data=>{
      const byCatch={}; const keys=[];
      const layer=L.geoJSON(data,{
        style:function(feature){
          const desc=feature.properties&&feature.properties.description&&feature.properties.description.value;
          const f=desc?parseDescriptionTable(desc):{};
          const cpy=parseInt(f['CutsPerYear']||'0',10);
          let color='#808080'; if(cpy===18) color='#1f77b4'; else if(cpy===15) color='#2ca02c';
          return {color,weight:2,fillOpacity:0.4};
        },
        onEachFeature:function(feature,lyr){
          const desc=feature.properties&&feature.properties.description&&feature.properties.description.value;
          const f=desc?parseDescriptionTable(desc):{};
          const catchment=f['OSS_CATCHMENT']||'Unassigned';
          const mowingID=f['MowingID']||feature.properties.name||'Unknown';
          const name=f['Name']||'';
          const label=mowingID+(name?' – '+name:'');
          const zoneLabel=/^\d+$/.test(catchment)?`Zone ${catchment}`:`Zone ${catchment}`;
          if(!byCatch[catchment]){byCatch[catchment]=[];keys.push(catchment);}
          byCatch[catchment].push({id:mowingID,name,label,layer:lyr,zone:zoneLabel});
          lyr.bindPopup('<b>'+label+'</b><br>'+zoneLabel);
        }
      }).addTo(map);

      catchmentRoot.innerHTML='';
      keys.sort((a,b)=>parseFloat(a)-parseFloat(b));
      keys.forEach(k=>{
        const section=document.createElement('div'); section.className='catchment-section';
        const title=document.createElement('div'); title.className='catchment-title'; title.textContent=`Zone ${k}`;
        const list=document.createElement('ul'); list.className='park-list';
        const ordered=orderByCustomOrDefault(byCatch[k].slice(),k);
        ordered.forEach((it,idx)=>{
          const li=document.createElement('li'); const st=loadState(it.id);
          const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!!st.checked;
          cb.addEventListener('change',()=>{st.checked=cb.checked;st.lastUpdated=todayISO();saveState(it.id,st);});
          li.appendChild(cb);
          const span=document.createElement('span'); span.textContent=`${idx+1}. ${it.label}`; span.style.cursor='pointer';
          span.addEventListener('click',()=>{if(it.layer.getBounds) map.fitBounds(it.layer.getBounds(),{padding:[20,20]}); if(it.layer.openPopup) it.layer.openPopup();});
          li.appendChild(span);
          const note=document.createElement('input'); note.type='text'; note.placeholder='Add note'; note.value=st.note||'';
          note.addEventListener('change',()=>{st.note=note.value;st.lastUpdated=todayISO();saveState(it.id,st);});
          li.appendChild(note);
          list.appendChild(li);
        });
        title.addEventListener('click',()=>{list.style.display=(list.style.display==='none'||!list.style.display)?'block':'none';});
        section.appendChild(title); section.appendChild(list); catchmentRoot.appendChild(section);
      });
    });
})();
// ====== End Parks Sidebar ======
