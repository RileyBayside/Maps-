(function(){
  if(!window.map){
    console.error("No existing Leaflet map found. Ensure your main map script initializes `window.map` first.");
    return;
  }
  var map = window.map;

  // add a toggle button
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

  // build sidebar container
  var sidebar = document.createElement('div');
  sidebar.id = 'bayside-sidebar';
  sidebar.innerHTML = `
    <h2>Parks by OSS Catchment</h2>
    <input id="bayside-filter" placeholder="Filter by ID or name..." />
    <div class="bayside-actions">
      <button id="expand-all">Expand all</button>
      <button id="collapse-all">Collapse all</button>
    </div>
    <div id="bayside-catchments"></div>`;
  document.body.appendChild(sidebar);
  var catchmentRoot = document.getElementById('bayside-catchments');
  var filterInput = document.getElementById('bayside-filter');

  function parseDescriptionTable(html){
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

  var candidatePaths = ['data.geojson','/data.geojson','data/data.geojson','assets/data.geojson','parks.geojson'];

  function loadFirstWorking(paths){
    return new Promise(function(resolve, reject){
      (function tryNext(i){
        if(i>=paths.length) return reject(new Error('No GeoJSON found.'));
        fetch(paths[i]).then(function(res){
          if(!res.ok) throw new Error('HTTP '+res.status);
          return res.json();
        }).then(function(json){ resolve(json); })
        .catch(function(){ tryNext(i+1); });
      })(0);
    });
  }

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

  loadFirstWorking(candidatePaths).then(function(data){
    var catchments = {};
    var geoLayer = L.geoJSON(data, {
      onEachFeature: function(feature, layer){
        var desc = feature.properties && feature.properties.description && feature.properties.description.value;
        var fields = desc ? parseDescriptionTable(desc) : {};
        var catchment = fields['OSS_CATCHMENT'] || 'Unassigned';
        var mowingID = fields['MowingID'] || feature.properties.name || 'Unknown';
        var name = fields['Name'] || '';
        var label = mowingID + (name ? ' – ' + name : '');
        if(!catchments[catchment]) catchments[catchment] = [];
        catchments[catchment].push({ id: mowingID, name: name, label: label, layer: layer });
        layer.bindPopup('<b>'+label+'</b><br>Catchment: '+catchment);
      }
    }).addTo(map);

    var keys = Object.keys(catchments).sort((a,b)=>parseFloat(a)-parseFloat(b));
    function renderList(filter){
      catchmentRoot.innerHTML='';
      keys.forEach(function(c){
        var items = catchments[c];
        var filtered = items.filter(function(it){ 
          if(!filter) return true;
          var f = filter.toLowerCase();
          return it.id.toLowerCase().includes(f) || (it.name && it.name.toLowerCase().includes(f));
        });
        if(filtered.length === 0) return;
        var section = document.createElement('div');
        section.className='catchment-section';
        var title = document.createElement('div');
        title.className='catchment-title';
        title.textContent='Catchment '+c+' ('+filtered.length+')';
        var body = document.createElement('div');
        body.className='catchment-body';
        var ul=document.createElement('ul');
        ul.className='catchment-list';
        filtered.sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true})).forEach(function(it){
          var li=document.createElement('li');
          li.textContent=it.label;
          li.addEventListener('click',function(){
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
        title.addEventListener('click',()=>body.classList.toggle('open'));
      });
    }
    renderList('');
    filterInput.addEventListener('input',e=>renderList(e.target.value||''));
    document.getElementById('expand-all').addEventListener('click',()=>document.querySelectorAll('.catchment-body').forEach(b=>b.classList.add('open')));
    document.getElementById('collapse-all').addEventListener('click',()=>document.querySelectorAll('.catchment-body').forEach(b=>b.classList.remove('open')));
    sidebar.classList.add('open');
  }).catch(err=>{
    console.error('GeoJSON load failed', err);
    catchmentRoot.innerHTML='<div style="color:#900">GeoJSON not found. Place data.geojson alongside script.js.</div>';
    sidebar.classList.add('open');
  });
})();