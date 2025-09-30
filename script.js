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








// ====== Parks Sidebar (uniform collapse + correct names + Zone5 fix) ======
(function(){
  function ready(fn){ if(document.readyState!='loading'){fn();} else {document.addEventListener('DOMContentLoaded', fn);} }
  ready(function(){
    // Wait for map to exist (Leaflet)
    function whenMap(cb){ if (typeof window.map !== 'undefined') cb(); else setTimeout(()=>whenMap(cb), 100); }
    whenMap(function(){
      const ADMIN_PASSWORD='Fishing101!';
      let isAdmin=false;

      // Build / attach sidebar + tab
      let side=document.getElementById('sidebar');
      if(!side){
        side=document.createElement('div');
        side.id='sidebar';
        side.innerHTML='<h2>Parks</h2><div class="admin-actions"><button id="adminLoginBtn">Admin Login</button></div><div class="global-actions"><button id="collapseExpandBtn">Collapse</button></div><div id="catchmentList"></div>';
        document.body.appendChild(side);
      } else {
        // Ensure required children exist
        if(!side.querySelector('.admin-actions')){
          const aa=document.createElement('div'); aa.className='admin-actions'; aa.innerHTML='<button id="adminLoginBtn">Admin Login</button>'; side.prepend(aa);
        }
        if(!side.querySelector('.global-actions')){
          const ga=document.createElement('div'); ga.className='global-actions'; ga.innerHTML='<button id="collapseExpandBtn">Collapse</button>'; side.insertBefore(ga, side.querySelector('#catchmentList'));
        }
        if(!side.querySelector('#catchmentList')){
          const cl=document.createElement('div'); cl.id='catchmentList'; side.appendChild(cl);
        }
      }
      let tab=document.getElementById('sidebarTab');
      if(!tab){
        tab=document.createElement('div'); tab.id='sidebarTab'; tab.className='sidebar-tab'; tab.textContent='Parks';
        tab.addEventListener('click',()=>{ side.classList.remove('collapsed'); tab.style.display='none'; });
        document.body.appendChild(tab);
      }

      const collapseBtn=document.getElementById('collapseExpandBtn');
      collapseBtn.onclick=function(){
        if(side.classList.contains('collapsed')){
          side.classList.remove('collapsed'); tab.style.display='none'; collapseBtn.textContent='Collapse';
        } else {
          side.classList.add('collapsed'); tab.style.display='block'; collapseBtn.textContent='Expand';
        }
      };

      const catchmentRoot=document.getElementById('catchmentList');

      function saveState(id, state){ try{ localStorage.setItem('park_'+id, JSON.stringify(state)); }catch(e){} }
      function loadState(id){ try{ const s=localStorage.getItem('park_'+id); return s?JSON.parse(s):{checked:false,note:'',lastUpdated:''}; }catch(e){ return {checked:false,note:'',lastUpdated:''}; } }
      function todayISO(){ const d=new Date(), p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
      function parseField(desc,key){
        if(!desc) return '';
        const re=new RegExp('<td>'+key+'</td><td>(.*?)</td>','i');
        const m=desc.match(re);
        return m?m[1].trim():'';
      }

      // Zone 5 order with M0803 at position 5
      const CUSTOM_ORDERS = {
        "5": ["M0766","M0790","M0791","M0321","M0803","M0331","M0332","M0329","M0330","M0756","M0758","M0322","M1676","M0764","M0324","M0323","M0760","M0328","M0325","M0327","M0762","M0753"]
      };

      function orderByCustom(items, zoneKey){
        const seq=CUSTOM_ORDERS[zoneKey];
        if(seq && seq.length){
          const map={}; items.forEach(it=>map[it.id]=it);
          return seq.map(id=>map[id]).filter(Boolean).concat(items.filter(it=>!seq.includes(it.id))); // keep extras at end
        }
        return items;
      }

      function buildCsvFromSection(section){
        const rows=[['Zone','Order','MowingID','Name','Checked','Note','LastUpdated']];
        const title=section.querySelector('.catchment-title').childNodes[0].textContent;
        const lis=section.querySelectorAll('.park-list li');
        lis.forEach((li,idx)=>{
          const span=li.querySelector('span');
          const parts=span.innerText.split(' – ');
          const left=parts[0]; const name=parts[1]||'';
          const idLabel=left.substring(left.indexOf('. ')+2);
          const cb=li.querySelector('input[type=checkbox]'); const note=li.querySelector('input[type=text]');
          const st=loadState(idLabel);
          rows.push([title, idx+1, idLabel, name, cb.checked?'Yes':'No', (note.value||'').replace(/[\r\n]+/g,' '), st.lastUpdated||'']);
        });
        return rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
      }

      function showAdminControls(){
        const aa=side.querySelector('.admin-actions');
        aa.innerHTML='<button id="exportCsvBtn">Export CSV</button><button id="resetBtn">Reset All</button><button id="completedTodayBtn">Completed Today</button>';
        document.getElementById('exportCsvBtn').onclick=function(){
          // all zones
          const rows=[['Zone','Order','MowingID','Name','Checked','Note','LastUpdated']];
          document.querySelectorAll('.catchment-section').forEach(section=>{
            const title=section.querySelector('.catchment-title').childNodes[0].textContent;
            section.querySelectorAll('.park-list li').forEach((li,idx)=>{
              const span=li.querySelector('span');
              const parts=span.innerText.split(' – ');
              const left=parts[0]; const name=parts[1]||'';
              const idLabel=left.substring(left.indexOf('. ')+2);
              const cb=li.querySelector('input[type=checkbox]'); const note=li.querySelector('input[type=text]');
              const st=loadState(idLabel);
              rows.push([title, idx+1, idLabel, name, cb.checked?'Yes':'No', (note.value||'').replace(/[\r\n]+/g,' '), st.lastUpdated||'']);
            });
          });
          const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\\r\\n');
          const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
          const a=document.createElement('a'); a.href=url; a.download='parks_status.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        };
        document.getElementById('resetBtn').onclick=function(){
          if(confirm('Reset all notes and checkboxes for every park?')){
            Object.keys(localStorage).forEach(k=>{ if(k.startsWith('park_')) localStorage.removeItem(k); });
            location.reload();
          }
        };
        document.getElementById('completedTodayBtn').onclick=function(){
          const today=todayISO();
          document.querySelectorAll('.park-list li').forEach(li=>{
            const span=li.querySelector('span');
            const idLabel=span.innerText.split(' – ')[0].split('. ')[1];
            const st=loadState(idLabel);
            li.style.display=(st.lastUpdated===today)?'flex':'none';
          });
        };
      }

      const adminBtn=side.querySelector('#adminLoginBtn');
      adminBtn.onclick=function(){
        const pwd=prompt('Enter admin password:');
        if(pwd===ADMIN_PASSWORD){ isAdmin=true; showAdminControls(); }
        else alert('Incorrect password.');
      };

      function renderZones(data){
        const byCatch={}; const keys=[];
        const layer=L.geoJSON(data,{
          style:function(feature){
            const desc=feature.properties && feature.properties.description && feature.properties.description.value;
            const cpy=parseInt(parseField(desc,'CutsPerYear')||'0',10);
            let color='#808080'; if(cpy===18) color='#1f77b4'; else if(cpy===15) color='#2ca02c';
            return {color,weight:2,fillOpacity:0.4};
          },
          onEachFeature:function(feature,lyr){
            const desc=feature.properties && feature.properties.description && feature.properties.description.value;
            const mowingID=parseField(desc,'MowingID') || feature.properties.name || 'Unknown';
            const name=parseField(desc,'Name') || feature.properties.name || '';
            const catchment=parseField(desc,'OSS_CATCHMENT') || 'Unassigned';
            const label=mowingID + (name ? ' – ' + name : '');
            if(!byCatch[catchment]){ byCatch[catchment]=[]; keys.push(catchment); }
            byCatch[catchment].push({id:mowingID,name,label,layer:lyr,zone:`Zone ${catchment}`});
          }
        }).addTo(map);

        catchmentRoot.innerHTML='';
        keys.sort((a,b)=>parseFloat(a)-parseFloat(b));
        keys.forEach(k=>{
          const section=document.createElement('div'); section.className='catchment-section';
          const title=document.createElement('div'); title.className='catchment-title'; title.textContent=`Zone ${k}`;
          const list=document.createElement('ul'); list.className='park-list';

          const ordered=orderByCustom(byCatch[k].slice(), String(k));
          ordered.forEach((it,idx)=>{
            const li=document.createElement('li'); const st=loadState(it.id);
            const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!!st.checked;
            cb.addEventListener('change',()=>{ st.checked=cb.checked; st.lastUpdated=todayISO(); saveState(it.id,st); });
            li.appendChild(cb);

            const span=document.createElement('span'); span.textContent=`${idx+1}. ${it.label}`; span.style.cursor='pointer';
            span.addEventListener('click',()=>{ if(it.layer.getBounds) map.fitBounds(it.layer.getBounds(),{padding:[20,20]}); if(it.layer.openPopup) it.layer.openPopup(); });
            li.appendChild(span);

            const note=document.createElement('input'); note.type='text'; note.placeholder='Add note'; note.value=st.note||'';
            note.addEventListener('change',()=>{ st.note=note.value; st.lastUpdated=todayISO(); saveState(it.id,st); });
            li.appendChild(note);

            list.appendChild(li);

            if(it.layer){ it.layer.bindPopup('<b>'+(idx+1)+'. '+it.label+'</b><br>'+it.zone); }
          });

          title.addEventListener('click',()=>{ list.style.display=(list.style.display==='none' || !list.style.display)?'block':'none'; });

          // Admin-only per-zone export button
          if(isAdmin){
            const exportBtn=document.createElement('button'); exportBtn.textContent='Export'; exportBtn.style.marginLeft='8px';
            exportBtn.addEventListener('click',()=>{
              const csv=buildCsvFromSection(section);
              const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
              const a=document.createElement('a'); a.href=url; a.download=title.childNodes[0].textContent+'_status.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
            });
            title.appendChild(exportBtn);
          }

          section.appendChild(title); section.appendChild(list);
          catchmentRoot.appendChild(section);
        });
      }

      // Fetch data
      fetch('data.geojson').then(r=>r.json()).then(renderZones).catch(e=>console.error('Failed to load data.geojson', e));
    });
  });
})();
// ====== End Parks Sidebar ======

