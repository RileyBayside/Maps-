(function(){
  // --- helper: inject minimal CSS as fallback so it works even if style.css omitted ---
  (function ensureStyle(){
    if(!document.getElementById('bayside-style-fallback')){
      var css = `:root{--bayside-sidebar-width:320px;}#bayside-sidebar{position:fixed;top:10px;left:10px;width:var(--bayside-sidebar-width);max-height:calc(100vh - 20px);overflow-y:auto;background:#fff;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.18);padding:10px 10px 14px;z-index:10000;display:none;font-family:system-ui, Arial, sans-serif;}#bayside-sidebar.open{display:block;}#bayside-sidebar h2{margin:6px 0 8px;font-size:18px;}#bayside-filter{width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:8px;margin-bottom:8px;}.bayside-actions{display:flex;gap:8px;margin-bottom:8px;}.bayside-actions button{padding:6px 8px;border:1px solid #ddd;background:#f8f8f8;border-radius:8px;cursor:pointer;}.catchment-section{border:1px solid #eee;border-radius:8px;margin-bottom:8px;}.catchment-title{padding:6px 8px;cursor:pointer;font-weight:600;background:#f7f7f7;border-bottom:1px solid #eee;border-radius:8px 8px 0 0;}.catchment-body{display:none;padding:6px 8px;}.catchment-body.open{display:block;}.catchment-list{list-style:none;margin:0;padding:0;}.catchment-list li{padding:6px 6px;cursor:pointer;border-radius:6px;}.catchment-list li:hover{background:#f0f0f0;}.leaflet-top.leaflet-left .bayside-toggle.leaflet-control{margin-top:70px;}.bayside-toggle a{width:32px;height:32px;line-height:32px;text-align:center;font-weight:700;}`;
      var s = document.createElement('style'); s.id='bayside-style-fallback'; s.textContent = css; document.head.appendChild(s);
    }
  })();

  // --- get or create map ---
  var map = window.map;
  if(!map){
    var mapEl = document.getElementById('map');
    if(!mapEl){ mapEl = document.createElement('div'); mapEl.id='map'; mapEl.style.height = '100vh'; document.body.appendChild(mapEl); }
    map = L.map('map').setView([-27.55, 153.25], 12);
    L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution:'Imagery © Google' }).addTo(map);
    window.map = map;
  }

  // --- add a toggle button as a Leaflet control ---
  var Toggle = L.Control.extend({
    onAdd: function(){
      var btn = L.DomUtil.create('div','leaflet-control bayside-toggle leaflet-bar');
      btn.innerHTML = '<a href="#" title="Catchments">☰</a>';
      L.DomEvent.on(btn, 'click', function(e){ L.DomEvent.stop(e); document.getElementById('bayside-sidebar').classList.toggle('open'); });
      return btn;
    },
    onRemove: function(){}
  });
  new Toggle({ position: 'topleft' }).addTo(map);

  // --- build the sidebar container (injected DOM) ---
  function ensureSidebar(){
    var el = document.getElementById('bayside-sidebar');
    if(el) return el;
    el = document.createElement('div');
    el.id = 'bayside-sidebar';
    el.innerHTML = [
      '<h2>Parks by OSS Catchment</h2>',
      '<input id="bayside-filter" placeholder="Filter by ID or name..." />',
      '<div class="bayside-actions">',
        '<button id="expand-all">Expand all</button>',
        '<button id="collapse-all">Collapse all</button>',
      '</div>',
      '<div id="bayside-catchments"></div>'
    ].join('');
    document.body.appendChild(el);
    return el;
  }
  var sidebar = ensureSidebar();
  var catchmentRoot = document.getElementById('bayside-catchments');
  var filterInput = document.getElementById('bayside-filter');

  // --- parse HTML table in description.value ---
  function parseDescriptionTable(html){
    // use DOMParser for robustness
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    var pairs = {};
    doc.querySelectorAll('tr').forEach(function(tr){
      var tds = tr.querySelectorAll('td');
      if(tds.length === 2){
        var k = tds[0].innerText.trim();
        var v = tds[1].innerText.trim();
        pairs[k] = v;
      }
    });
    return pairs;
  }

  // --- try a list of potential data paths so it works in varied repos ---
  var candidatePaths = ['data.geojson','/data.geojson','data/data.geojson','assets/data.geojson','parks.geojson'];

  function loadFirstWorking(paths){
    return new Promise(function(resolve, reject){
      (function tryNext(i){
        if(i>=paths.length) return reject(new Error('No GeoJSON found at any known path.'));
        fetch(paths[i]).then(function(res){
          if(!res.ok) throw new Error('HTTP '+res.status);
          return res.json();
        }).then(function(json){ resolve({json, path: paths[i]}); })
        .catch(function(){ tryNext(i+1); });
      })(0);
    });
  }

  // --- highlighting helper ---
  var lastHighlighted = null;
  function highlight(layer){
    if(lastHighlighted && lastHighlighted.setStyle) {
      try{ lastHighlighted.setStyle(lastHighlighted.__orig || {}); }catch(e){}
    }
    if(layer && layer.setStyle){
      if(!layer.__orig){ layer.__orig = { color: layer.options.color || '#555', weight: layer.options.weight || 1.5, fillOpacity: layer.options.fillOpacity || 0.5 }; }
      layer.setStyle({ color:'#ff7800', weight:3, fillOpacity:0.6 });
      lastHighlighted = layer;
    }
  }

  // --- main load ---
  loadFirstWorking(candidatePaths).then(function(res){
    var data = res.json;
    var catchments = {}; // { '1': [ {id, name, label, layer} ] }
    var layerIndexById = {};

    var geoLayer = L.geoJSON(data, {
      onEachFeature: function(feature, layer){
        try{
          var desc = feature.properties && feature.properties.description && feature.properties.description.value;
          var fields = desc ? parseDescriptionTable(desc) : {};
          var catchment = fields['OSS_CATCHMENT'] || 'Unassigned';
          var mowingID = fields['MowingID'] || fields['UniqueID'] || feature.properties.name || 'Unknown';
          var name = fields['Name'] || '';
          var label = mowingID + (name ? ' – ' + name : '');

          if(!catchments[catchment]) catchments[catchment] = [];
          catchments[catchment].push({ id: mowingID, name: name, label: label, layer: layer });
          layerIndexById[mowingID] = layer;

          // basic popup
          layer.bindPopup('<b>'+label+'</b><br>Catchment: '+catchment);
        }catch(e){
          console.warn('Feature parse error', e, feature);
        }
      }
    }).addTo(map);

    // --- render sidebar sections ---
    var catchmentKeys = Object.keys(catchments).sort(function(a,b){
      var na = parseFloat(a), nb = parseFloat(b);
      if(!isNaN(na) && !isNaN(nb)) return na - nb;
      return (''+a).localeCompare((''+b), undefined, { numeric: true });
    });

    function renderList(filter){
      catchmentRoot.innerHTML='';
      catchmentKeys.forEach(function(c){
        var items = catchments[c];
        var filtered = items.filter(function(it){ 
          if(!filter) return true;
          var f = filter.toLowerCase();
          return it.id.toLowerCase().includes(f) || (it.name && it.name.toLowerCase().includes(f));
        });
        if(filtered.length === 0) return;

        var section = document.createElement('div');
        section.className = 'catchment-section';

        var title = document.createElement('div');
        title.className = 'catchment-title';
        title.textContent = 'Catchment ' + c + ' ('+filtered.length+')';

        var body = document.createElement('div');
        body.className = 'catchment-body';

        var ul = document.createElement('ul');
        ul.className = 'catchment-list';

        filtered.sort(function(a,b){ return a.id.localeCompare(b.id, undefined, {numeric:true}); })
          .forEach(function(it){
            var li = document.createElement('li');
            li.textContent = it.label;
            li.addEventListener('click', function(){
              if(it.layer.getBounds){ map.fitBounds(it.layer.getBounds(), { padding:[20,20] }); }
              if(it.layer.openPopup){ it.layer.openPopup(); }
              highlight(it.layer);
            });
            ul.appendChild(li);
          });

        body.appendChild(ul);
        section.appendChild(title);
        section.appendChild(body);
        catchmentRoot.appendChild(section);

        // toggle open/closed
        title.addEventListener('click', function(){
          body.classList.toggle('open');
        });
      });
    }
    renderList('');

    // filter
    filterInput.addEventListener('input', function(e){ renderList(e.target.value || ''); });

    // Expand/collapse all
    document.getElementById('expand-all').addEventListener('click', function(){
      document.querySelectorAll('.catchment-body').forEach(function(b){ b.classList.add('open'); });
    });
    document.getElementById('collapse-all').addEventListener('click', function(){
      document.querySelectorAll('.catchment-body').forEach(function(b){ b.classList.remove('open'); });
    });

    // open the panel on first load so it's visible
    document.getElementById('bayside-sidebar').classList.add('open');
  }).catch(function(err){
    console.error('Failed to load GeoJSON for sidebar', err);
    // still show panel with message to help debug
    var side = ensureSidebar();
    side.classList.add('open');
    document.getElementById('bayside-catchments').innerHTML = '<div style="color:#900">Could not find data.geojson. Place your GeoJSON next to script.js or rename it to data.geojson.</div>';
  });
})();