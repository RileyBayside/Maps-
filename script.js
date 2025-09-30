// Initialize map with Google Hybrid Satellite as default
var map = L.map('map').setView([-27.55, 153.25], 12);
var googleHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    maxZoom: 20, subdomains: ['mt0','mt1','mt2','mt3'], attribution: 'Imagery © Google'
}).addTo(map);
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap contributors'
});
L.control.layers({"Google Hybrid": googleHybrid, "OSM Streets": osm}).addTo(map);

// Load GeoJSON
fetch('data.geojson').then(r=>r.json()).then(data => {
    L.geoJSON(data, {
        onEachFeature: function (feature, layer) {
            let id = feature.properties.id;
            let name = feature.properties.name;
            layer.bindPopup(id + " – " + name);
        }
    }).addTo(map);
});

// Sidebar toggle with tab visible when collapsed
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggleSidebar');
toggleBtn.onclick = () => { sidebar.classList.toggle('collapsed'); };

// LocalStorage persistence for checkboxes & notes
function saveProgress() {
    const notes = {};
    document.querySelectorAll('.note').forEach(n => { notes[n.dataset.id] = n.value; });
    localStorage.setItem('notes', JSON.stringify(notes));
}
function loadProgress() {
    const notes = JSON.parse(localStorage.getItem('notes') || '{}');
    Object.keys(notes).forEach(id => {
        const el = document.querySelector('.note[data-id="'+id+'"]');
        if (el) el.value = notes[id];
    });
}
loadProgress();
document.addEventListener('input', e => { if (e.target.classList.contains('note')) saveProgress(); });

// Admin reset
document.getElementById('adminLogin').onclick = () => {
    let pass = prompt("Enter admin password:");
    if (pass === "admin123") {
        document.getElementById('resetBtn').style.display = 'block';
    }
};
document.getElementById('resetBtn').onclick = () => {
    localStorage.clear(); location.reload();
};
