
// Basemaps: Google Hybrid (default) + OSM Streets
const map = L.map('map', { zoomControl: true }).setView([-27.55, 153.25], 12);
const hybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
  maxZoom: 20, subdomains: ['mt0','mt1','mt2','mt3'], attribution: 'Imagery © Google'
}).addTo(map);
const streets = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 20, attribution: '&copy; OpenStreetMap contributors'
});
L.control.layers({'Hybrid (Satellite)': hybrid, 'Streets (OSM)': streets}, {}, {collapsed:true}).addTo(map);

const CUSTOM_ORDERS = {"1": ["M0123", "M0427", "M0402", "M0136", "M0364", "M0408", "M0819", "M0105", "M0359", "M0361", "M0362", "M0363", "M1677", "M0392", "M0436", "M0110", "M0147", "M0367", "M0374", "M0163", "M0140", "M1361", "M0390", "M0389", "M0130", "M0103", "M0350", "M0120", "M0114", "M0104", "M0131", "M0388", "M0394", "M0356", "M01360", "M0358", "M0369", "M0133", "M0385", "M0370", "M0368", "M0432", "M0355", "M0139", "M0122", "M0143", "M0111", "M0157", "M0424", "M0165", "M0815", "M0354", "M0875", "M0375", "M0338", "M0137", "M0149", "M0366", "M0794", "M0113", "M0118", "M0138", "M0380", "M0398", "M0132", "M0342", "M0116", "M0135", "M0774", "M0134", "M0391", "M0405", "M0145", "M0112", "M0146", "M1680", "M0337", "M0160", "M0334", "M0352", "M0154", "M0412", "M0333"], "2": ["M0504", "M0442", "M0170", "M0480", "M0167", "M0513", "M0439", "M0440", "M0514", "M0180", "M0200", "M0447", "M0202", "M0493", "M0526", "M0183", "M0201", "M0166", "M0184", "M0206", "M0187", "M0812", "M0043", "M0470", "M0172", "M0171", "M0199", "M0179", "M0196", "M0463", "M0538", "M0054", "M0175", "M0197", "M0518", "M0516", "M0168", "M0534", "M0438", "M0173", "M0178", "M0204", "M0181", "M0203", "M0792", "M0186", "M0814", "M0521", "M0498", "M0198", "M0205", "M0797", "M0515", "M0188", "M0169", "M0189", "M0483", "M0484", "M0174", "M0448", "M0185", "M0490", "M0193", "M0527", "M0485", "M0524", "M0190", "M0194", "M0177", "M0182", "M0195", "M0492", "M0530", "M0326", "M0191", "M0488", "M0476", "M1543", "M0452", "M0192", "M0044", "M0176"], "3": ["M0221", "M0250", "M0559", "M0606", "M0218", "M0219", "M0067", "M0552", "M0553", "M0603", "M0217", "M0784", "M0593", "M0246", "M0563", "M0562", "M0605", "M0567", "M0251", "M0598", "M0225", "M0579", "M0543", "M0232", "M0207", "M0208", "M0568", "M0570", "M0602", "M0588", "M0549", "M0230", "M0578", "M0231", "M0214", "M0600", "M0237", "M0238", "M0235", "M0229", "M0236", "M0248", "M0212", "M0226", "M0209", "M0222", "M0227", "M0241", "M0213", "M0242", "M0243", "M0211", "M0224", "M0575", "M0584", "M0234", "M0233", "M0216", "M0569", "M0215", "M0065", "M0583", "M0557", "M0545", "M1515", "M0210", "M0604", "M0565", "M0554", "M1687", "M0574", "M0550", "M0247", "M0779", "M0239", "M0564", "M0587", "M0777", "M0228", "M0830", "M0682", "M0555", "M0240"], "4": ["M0710", "M0700", "M0677", "M0297", "M0301", "M0702", "M0647", "M0723", "M0626", "M0739", "M1358", "M0740", "M0741", "M0674", "M0610", "M0733", "M0722", "M0621", "M0253", "M0616", "M0270", "M0086", "M0709", "M0746", "M0660", "M0716", "M0315", "M0283", "M0282", "M0689", "M0666", "M0638", "M1679", "M0261", "M0823", "M2021", "M0699", "M0302", "M0634", "M0734", "M0274", "M0316", "M0259", "M0627", "M0299", "M0269", "M0665", "M0305", "M0742", "M0313", "M0314", "M0087", "M1668", "M0825", "M1684", "M0869", "M0284", "M1682", "M0300", "M0276", "M0684", "M0728", "M0306", "M0727", "M0641", "M0717", "M0265", "M0266", "M0078", "M0748", "M0697", "M0257", "M0413", "M0320", "M0636", "M0653", "M0622", "M0264", "M0640", "M0608", "M0612", "M0688", "M0752"], "5": ["M0766", "M0790", "M0791", "M0321", "M0803", "M0331", "M0332", "M0329", "M0330", "M0756", "M0758", "M0322", "M1676", "M0764", "M0324", "M0323", "M0760", "M0328", "M0325", "M0327", "M0762", "M0753"]};

const ADMIN_PASSWORD='Fishing101!'; let isAdmin=false;

// Sidebar controls
const sidebar = document.getElementById('sidebar');
const collapseBtn = document.getElementById('collapseBtn');
const sidebarTab = document.getElementById('sidebarTab');
const catchmentRoot = document.getElementById('catchmentList');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminControls = document.getElementById('adminControls');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const resetBtn = document.getElementById('resetBtn');

// Expanded by default
sidebar.classList.remove('collapsed');

function toggleSidebar(){ sidebar.classList.toggle('collapsed'); }
collapseBtn.addEventListener('click', toggleSidebar);
sidebarTab.addEventListener('click', toggleSidebar);

// Local storage helpers
function saveState(id, state){ localStorage.setItem('park_'+id, JSON.stringify(state)); }
function loadState(id){ const s=localStorage.getItem('park_'+id); return s?JSON.parse(s):{checked:false,note:'',lastUpdated:''}; }
function todayISO(){ const d=new Date(), p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }

// Parse field from description table HTML
function parseField(desc,key){ if(!desc) return ''; const re=new RegExp('<td>'+key+'</td><td>(.*?)</td>','i'); const m=desc.match(re); return m?m[1].trim():''; }

function orderByCustom(items, zoneKey){
  const seq = (CUSTOM_ORDERS[zoneKey]||[]);
  if(!seq.length) return items;
  const map = Object.fromEntries(items.map(it=>[it.id,it]));
  const ordered = seq.map(id=>map[id]).filter(Boolean);
  const extras = items.filter(it=>!seq.includes(it.id));
  return ordered.concat(extras);
}

function csvAll(){
  const rows=[['Zone','Order','MowingID','Name','Checked','Note','Last Updated']];
  document.querySelectorAll('.catchment-section').forEach(section=>{
    const zone=section.querySelector('.catchment-title').childNodes[0].textContent;
    section.querySelectorAll('.park-list li').forEach((li,idx)=>{
      const span=li.querySelector('span');
      const parts=span.innerText.split(' – ');
      const left=parts[0]; const name=parts.slice(1).join(' – ');
      const idLabel=left.substring(left.indexOf('. ')+2);
      const cb=li.querySelector('input[type=checkbox]');
      const note=li.querySelector('input[type=text]');
      const st=loadState(idLabel);
      rows.push([zone, idx+1, idLabel, name, cb.checked?'Yes':'No', (note.value||'').replace(/[\r\n]+/g,' '), st.lastUpdated||'']);
    });
  });
  return rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
}

// Admin login & actions
adminLoginBtn.addEventListener('click',()=>{ const pwd=prompt('Enter admin password:'); if(pwd===ADMIN_PASSWORD){isAdmin=true; adminControls.classList.remove('hidden');} else alert('Incorrect password.'); });
exportCsvBtn.addEventListener('click',()=>{ const csv=csvAll(); const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='parks_status.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); });
resetBtn.addEventListener('click',()=>{ if(confirm('Reset all notes and checkboxes for every park?')){ Object.keys(localStorage).forEach(k=>{ if(k.startsWith('park_')) localStorage.removeItem(k); }); location.reload(); } });

// Load GeoJSON and build UI
fetch('data.geojson').then(r=>r.json()).then(data=>{
  const byCatch={}; const keys=[];
  const g = L.geoJSON(data, {
    style:(feature)=>{
      const desc = feature.properties && feature.properties.description && feature.properties.description.value;
      const cpy = parseInt(parseField(desc,'CutsPerYear')||'0',10);
      let color='#808080'; if(cpy===18) color='#1f77b4'; else if(cpy===15) color='#2ca02c';
      return {color, weight:2, fillOpacity:.35};
    },
    onEachFeature:(feature, layer)=>{
      const desc = feature.properties && feature.properties.description && feature.properties.description.value;
      const mowingID = parseField(desc,'MowingID') || feature.properties.name || 'Unknown';
      const name = parseField(desc,'Name') || feature.properties.name || '';
      const catchment = parseField(desc,'OSS_CATCHMENT') || 'Unassigned';
      const zoneKey = String(catchment);
      const label = mowingID + (name ? ' – ' + name : '');
      if(!byCatch[zoneKey]){ byCatch[zoneKey]=[]; keys.push(zoneKey); }
      byCatch[zoneKey].push({id:mowingID, name, label, layer, zone:`Zone ${zoneKey}`});
    }
  }).addTo(map);
  try{ map.fitBounds(g.getBounds()); }catch(e){}

  // Render sidebar (zones collapsed by default)
  catchmentRoot.innerHTML='';
  keys.sort((a,b)=>parseFloat(a)-parseFloat(b));
  keys.forEach(k=>{
    const section=document.createElement('div'); section.className='catchment-section';
    const title=document.createElement('div'); title.className='catchment-title'; title.textContent=`Zone ${k}`;
    const list=document.createElement('ul'); list.className='park-list'; list.style.display='none';

    const ordered = orderByCustom(byCatch[k].slice(), k);
    ordered.forEach((it, idx)=>{
      const li=document.createElement('li'); const st=loadState(it.id);
      const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!!st.checked;
      cb.addEventListener('change',()=>{ st.checked=cb.checked; st.lastUpdated=todayISO(); saveState(it.id,st); });
      li.appendChild(cb);
      const span=document.createElement('span'); span.textContent = `${idx+1}. ${it.label}`; span.style.cursor='pointer';
      span.addEventListener('click',()=>{ if(it.layer.getBounds) map.fitBounds(it.layer.getBounds(),{padding:[20,20]}); if(it.layer.openPopup) it.layer.openPopup(); });
      li.appendChild(span);
      const note=document.createElement('input'); note.type='text'; note.placeholder='Add note'; note.value=st.note||'';
      note.addEventListener('change',()=>{ st.note=note.value; st.lastUpdated=todayISO(); saveState(it.id,st); });
      li.appendChild(note);
      list.appendChild(li);
      if(it.layer) it.layer.bindPopup('<b>'+(idx+1)+'. '+it.label+'</b><br>'+'Zone '+k);
    });

    title.addEventListener('click',()=>{ list.style.display=(list.style.display==='none'||!list.style.display)?'block':'none'; });
    section.appendChild(title); section.appendChild(list); catchmentRoot.appendChild(section);
  });
}).catch(e=>console.error('Failed to load data.geojson', e));
