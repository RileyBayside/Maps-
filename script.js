var map = L.map('map').setView([-27.55, 153.25], 12);

// Google Satellite Layer
L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0','mt1','mt2','mt3'],
    attribution: 'Imagery © Google'
}).addTo(map);

const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggleBtn');
const collapsedTab = document.getElementById('collapsedTab');

toggleBtn.onclick = function() {
  sidebar.classList.add('collapsed');
  collapsedTab.style.display = 'block';
};

collapsedTab.onclick = function() {
  sidebar.classList.remove('collapsed');
  collapsedTab.style.display = 'none';
};
