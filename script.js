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





// ====== Parks Sidebar (final build) ======
(function(){
  if (typeof map === 'undefined') { console.error('Map is not defined.'); return; }

  const ADMIN_PASSWORD = 'Fishing101!';
  let isAdmin = false;
  let expandedAll = false;

  const CUSTOM_ORDERS = {"1":["M0123","M0427","M0402","M0136","M0364","M0408","M0819","M0105","M0359","M0361","M0362","M0363","M1677","M0392","M0436","M0110","M0147","M0367","M0374","M0163","M0140","M1361","M0390","M0389","M0130","M0103","M0350","M0120","M0114","M0104","M0131","M0388","M0394","M0356","M01360","M0358","M0369","M0133","M0385","M0370","M0368","M0432","M0355","M0139","M0122","M0143","M0111","M0157","M0424","M0165","M0815","M0354","M0875","M0375","M0338","M0137","M0149","M0366","M0794","M0113","M0118","M0138","M0380","M0398","M0132","M0342","M0116","M0135","M0774","M0134","M0391","M0405","M0145","M0112","M0146","M1680","M0337","M0160","M0334","M0352","M0154","M0412","M0333","M0809","M0386","M0162","M0343","M0407","M0127","M0119","M0428","M0430","M0429","M1698","M1507","M0109","M0141","M0820","M0117","M0159","M0346","M0144","M0121","M0372","M0128","M0376","M0377","M0340","M0032","M0434","M0360","M0108","M0379","M1544","M0152","M0151","M0397","M0126","M0808","M0371","M0156","M0335","M0400","M0423","M0155","M0124","M0125","M0038","M0349","M0373","M0365","M0142","M0403","M0158","M0129","M0351","M0150","M0153","M0148","M0161","M0401"],"2":["M0504","M0442","M0170","M0480","M0167","M0513","M0439","M0440","M0514","M0180","M0200","M0447","M0202","M0493","M0526","M0183","M0201","M0166","M0184","M0206","M0187","M0812","M0043","M0470","M0172","M0171","M0199","M0179","M0196","M0463","M0538","M0054","M0175","M0197","M0518","M0516","M0168","M0534","M0438","M0173","M0178","M0204","M0181","M0203","M0792","M0186","M0814","M0521","M0498","M0198","M0205","M0797","M0515","M0188","M0169","M0189","M0483","M0484","M0174","M0448","M0185","M0490","M0193","M0527","M0485","M0524","M0190","M0194","M0177","M0182","M0195","M0492","M0530","M0326","M0191","M0488","M0476","M1543","M0452","M0192","M0044","M0176"],"3":["M0221","M0250","M0559","M0606","M0218","M0219","M0067","M0552","M0553","M0603","M0217","M0784","M0593","M0246","M0563","M0562","M0605","M0567","M0251","M0598","M0225","M0579","M0543","M0232","M0207","M0208","M0568","M0570","M0602","M0588","M0549","M0230","M0578","M0231","M0214","M0600","M0237","M0238","M0235","M0229","M0236","M0248","M0212","M0226","M0209","M0222","M0227","M0241","M0213","M0242","M0243","M0211","M0224","M0575","M0584","M0234","M0233","M0216","M0569","M0215","M0065","M0583","M0557","M0545","M1515","M0210","M0604","M0565","M0554","M1687","M0574","M0550","M0247","M0779","M0239","M0564","M0587","M0777","M0228","M0830","M0682","M0555","M0240","M0544","M0585","M0572","M0245","M0591","M0590","M0223","M0780","M0220","M0858","M0252","M0796"],"4":["M0710","M0700","M0677","M0297","M0301","M0702","M0647","M0723","M0626","M0739","M1358","M0740","M0741","M0674","M0610","M0733","M0722","M0621","M0253","M0616","M0270","M0086","M0709","M0746","M0660","M0716","M0315","M0283","M0282","M0689","M0666","M0638","M1679","M0261","M0823","M2021","M0699","M0302","M0634","M0734","M0274","M0316","M0259","M0627","M0299","M0269","M0665","M0305","M0742","M0313","M0314","M0087","M1668","M0825","M1684","M0869","M0284","M1682","M0300","M0276","M0684","M0728","M0306","M0727","M0641","M0717","M0265","M0266","M0078","M0748","M0697","M0257","M0413","M0320","M0636","M0653","M0622","M0264","M0640","M0608","M0612","M0688","M0752","M0680","M0288","M0310","M0318","M0319","M0655","M0729","M0617","M0725","M0671","M0275","M0663","M0731","M0718","M0296","M0291","M0311","M0729","M0619","M0312","M0705","M0503","M0631","M0304","M0415","M0262","M0645","M0793","M0414","M0268","M0625","M0607","M0290","M0736","M0260","M0735","M1021","M0661","M0307","M0309","M0308","M0286","M0293","M0263","M0694","M0693","M0272","M0696","M0781","M0692","M0285","M0695","M0279","M0082","M0295","M0294","M0737","M0658","M0685","M0280","M0657","M0656","M0271","M0267","M0019","M0298","M0730","M0667","M0289","M0618","M0670","M0681","M0092","M0084","M0085","M0258","M0642","M0281","M1688","M0278","M0744","M0303","M0726","M0255","M0317","M0256","M0789","M1673","M1660","M0785","M0650","M0273","M0817","M0750","M0724","M0679"],"5":["M0766","M0790","M0791","M0321","M0803","M0331","M0332","M0329","M0330","M0756","M0758","M0322","M1676","M0764","M0324","M0323","M0760","M0328","M0325","M0327","M0762","M0753"]};

  function ensureSidebar() {
    let side = document.getElementById('sidebar');
    if (!side) {
      side = document.createElement('div');
      side.id = 'sidebar';
      side.innerHTML = '<h2>Parks</h2>' +
        '<div class="admin-actions"><button id="adminLoginBtn">Admin Login</button></div>' +
        '<div class="global-actions"><button id="collapseExpandBtn">Expand All</button></div>' +
        '<div id="catchmentList"></div>';
      document.body.appendChild(side);
    }
    return {root: side, list: document.getElementById('catchmentList')};
  }

  const { root: sidebarRoot, list: catchmentRoot } = ensureSidebar();

  function saveState(id, state){ localStorage.setItem('park_'+id, JSON.stringify(state)); }
  function loadState(id){ let s = localStorage.getItem('park_'+id); return s ? JSON.parse(s) : {checked:false, note:'', lastUpdated:''}; }
  function todayISO(){ const d=new Date(), p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }

  function parseFieldFromDesc(desc, key){ if(!desc) return ''; const re = new RegExp('<td>'+key+'</td><td>(.*?)</td>', 'i'); const m = desc.match(re); return m ? m[1].trim() : ''; }

  function orderByCustom(items, zoneKey){ const seq = CUSTOM_ORDERS[zoneKey]; if(seq && seq.length){ const map={}; items.forEach(it=>map[it.id]=it); return seq.map(id=>map[id]).filter(Boolean); } return items; }

  function renderZones(data){
    const byCatch={}; const keys=[];
    L.geoJSON(data,{
      style:function(feature){
        const desc=feature.properties&&feature.properties.description&&feature.properties.description.value;
        const cpy=parseInt(parseFieldFromDesc(desc,'CutsPerYear')||'0',10);
        let color='#808080'; if(cpy===18) color='#1f77b4'; else if(cpy===15) color='#2ca02c';
        return {color,weight:2,fillOpacity:0.4};
      },
      onEachFeature:function(feature,layer){
        const desc=feature.properties&&feature.properties.description&&feature.properties.description.value;
        const mowingID=parseFieldFromDesc(desc,'MowingID')||feature.properties.name||'Unknown';
        const name=parseFieldFromDesc(desc,'Name')||feature.properties.name||''; // address from table Name; fallback to properties.name
        const catchment=parseFieldFromDesc(desc,'OSS_CATCHMENT')||'Unassigned';
        const label=mowingID+(name?' – '+name:'');
        const zoneLabel=`Zone ${catchment}`;
        if(!byCatch[catchment]){byCatch[catchment]=[];keys.push(catchment);}
        byCatch[catchment].push({id:mowingID,name,label,layer,zone:zoneLabel});
      }
    }).addTo(map);

    catchmentRoot.innerHTML='';
    keys.sort((a,b)=>parseFloat(a)-parseFloat(b));
    keys.forEach(k=>{
      const section=document.createElement('div'); section.className='catchment-section';
      const title=document.createElement('div'); title.className='catchment-title'; title.textContent=`Zone ${k}`;
      const list=document.createElement('ul'); list.className='park-list';

      const ordered=orderByCustom(byCatch[k].slice(),k);
      ordered.forEach((it,idx)=>{
        const li=document.createElement('li'); const st=loadState(it.id);
        const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!!st.checked;
        cb.addEventListener('change',()=>{st.checked=cb.checked;st.lastUpdated=todayISO();saveState(it.id,st);});
        li.appendChild(cb);

        const span=document.createElement('span'); span.textContent=`${idx+1}. ${it.label}`; span.style.cursor='pointer';
        span.addEventListener('click',()=>{ if(it.layer.getBounds) map.fitBounds(it.layer.getBounds(),{padding:[20,20]}); if(it.layer.openPopup) it.layer.openPopup(); });
        li.appendChild(span);

        const note=document.createElement('input'); note.type='text'; note.placeholder='Add note'; note.value=st.note||'';
        note.addEventListener('change',()=>{st.note=note.value;st.lastUpdated=todayISO();saveState(it.id,st);});
        li.appendChild(note);

        list.appendChild(li);
        if(it.layer){ it.layer.bindPopup('<b>'+(idx+1)+'. '+it.label+'</b><br>'+it.zone); }
      });

      title.addEventListener('click',()=>{ list.style.display=(list.style.display==='none'||!list.style.display)?'block':'none'; });

      if(isAdmin){ // per-zone export button
        const exportBtn=document.createElement('button'); exportBtn.textContent='Export'; exportBtn.style.marginLeft='8px';
        exportBtn.addEventListener('click',()=>{
          const rows=[['Zone','Order','MowingID','Name','Checked','Note','LastUpdated']];
          list.querySelectorAll('li').forEach((li,idx)=>{
            const span=li.querySelector('span');
            const parts=span.innerText.split(' – ');
            const left=parts[0]; const name=parts[1]||'';
            const idLabel=left.substring(left.indexOf('. ')+2);
            const cb=li.querySelector('input[type=checkbox]'); const note=li.querySelector('input[type=text]');
            const st=loadState(idLabel);
            rows.push([title.childNodes[0].textContent, idx+1, idLabel, name, cb.checked?'Yes':'No', (note.value||'').replace(/[\r\n]+/g,' '), st.lastUpdated||'']);
          });
          const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
          const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
          const a=document.createElement('a'); a.href=url; a.download=title.childNodes[0].textContent+'_status.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        });
        title.appendChild(exportBtn);
      }

      section.appendChild(title); section.appendChild(list); catchmentRoot.appendChild(section);
    });
  }

  function buildCsv(){
    const rows=[['Zone','Order','MowingID','Name','Checked','Note','LastUpdated']];
    document.querySelectorAll('.catchment-section').forEach(section=>{
      const zone=section.querySelector('.catchment-title').childNodes[0].textContent;
      section.querySelectorAll('.park-list li').forEach((li,idx)=>{
        const span=li.querySelector('span');
        const parts=span.innerText.split(' – ');
        const left=parts[0]; const name=parts[1]||'';
        const idLabel=left.substring(left.indexOf('. ')+2);
        const cb=li.querySelector('input[type=checkbox]'); const note=li.querySelector('input[type=text]');
        const st=loadState(idLabel);
        rows.push([zone, idx+1, idLabel, name, cb.checked?'Yes':'No', (note.value||'').replace(/[\r\n]+/g,' '), st.lastUpdated||'']);
      });
    });
    return rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  }

  function showAdminControls(){
    const actions=document.querySelector('.admin-actions');
    actions.innerHTML='<button id="exportCsvBtn">Export CSV</button><button id="resetBtn">Reset All</button><button id="completedTodayBtn">Completed Today</button>';
    document.getElementById('exportCsvBtn').addEventListener('click',()=>{ 
      const csv=buildCsv(); const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download='parks_status.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });
    document.getElementById('resetBtn').addEventListener('click',()=>{ 
      if(confirm('Reset all notes and checkboxes for every park?')){ Object.keys(localStorage).forEach(k=>{ if(k.startsWith('park_')) localStorage.removeItem(k); }); location.reload(); }
    });
    document.getElementById('completedTodayBtn').addEventListener('click',()=>{ 
      const today=todayISO();
      document.querySelectorAll('.park-list li').forEach(li=>{ 
        const span=li.querySelector('span'); const idLabel=span.innerText.split(' – ')[0].split('. ')[1];
        const st=loadState(idLabel);
        li.style.display=(st.lastUpdated===today)?'flex':'none';
      });
    });
  }

  // Global collapse/expand
  const ceBtn=document.getElementById('collapseExpandBtn');
  if(ceBtn){ ceBtn.addEventListener('click',()=>{ 
    expandedAll=!expandedAll; 
    document.querySelectorAll('.park-list').forEach(list=>{ list.style.display=expandedAll?'block':'none'; }); 
    ceBtn.textContent=expandedAll?'Collapse All':'Expand All';
  }); }

  // Admin login
  const adminBtn=document.getElementById('adminLoginBtn');
  if(adminBtn){ adminBtn.addEventListener('click',()=>{ 
    const pwd=prompt('Enter admin password:');
    if(pwd===ADMIN_PASSWORD){ isAdmin=true; showAdminControls(); fetch('data.geojson').then(r=>r.json()).then(renderZones); }
    else alert('Incorrect password.');
  }); }

  // Initial render
  fetch('data.geojson').then(r=>r.json()).then(renderZones);
})();
// ====== End Parks Sidebar ======
