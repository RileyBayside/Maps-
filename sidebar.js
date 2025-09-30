
(function() {
  const ADMIN_PASSWORD = "Fishing101!";
  const SIDEBAR_COLLAPSED_KEY = "sidebarCollapsed";
  const PARK_DATA_KEY = "parkData";

  // Zones (IDs only)
  const zones = {
    "Zone 1": [ "M0123","M0427","M0402","M0136","M0364","M0408","M0819","M0105","M0359","M0361","M0362","M0363","M1677","M0392","M0436","M0110","M0147","M0367","M0374","M0163","M0140","M1361","M0390","M0389","M0130","M0103","M0350","M0120","M0114","M0104","M0131","M0388","M0394","M0356","M01360","M0358","M0369","M0133","M0385","M0370","M0368","M0432","M0355","M0139","M0122","M0143","M0111","M0157","M0424","M0165","M0815","M0354","M0875","M0375","M0338","M0137","M0149","M0366","M0794","M0113","M0118","M0138...
    "Zone 2": [ "M0504","M0442","M0170","M0480","M0167","M0513","M0439","M0440","M0514","M0180","M0200","M0447","M0202","M0493","M0526","M0183","M0201","M0166","M0184","M0206","M0187","M0812","M0043","M0470","M0172","M0171","M0199","M0179","M0196","M0463","M0538","M0054","M0175","M0197","M0518","M0516","M0168","M0534","M0438","M0173","M0178","M0204","M0181","M0203","M0792","M0186","M0814","M0521","M0498","M0198","M0205","M0797","M0515","M0188","M0169","M0189","M0483","M0484","M0174","M0448","M0185","M049...
    "Zone 3": [ "M0221","M0250","M0559","M0606","M0218","M0219","M0067","M0552","M0553","M0603","M0217","M0784","M0593","M0246","M0563","M0562","M0605","M0567","M0251","M0598","M0225","M0579","M0543","M0232","M0207","M0208","M0568","M0570","M0602","M0588","M0549","M0230","M0578","M0231","M0214","M0600","M0237","M0238","M0235","M0229","M0236","M0248","M0212","M0226","M0209","M0222","M0227","M0241","M0213","M0242","M0243","M0211","M0224","M0575","M0584","M0234","M0233","M0216","M0569","M0215","M0065","M058...
    "Zone 4": [ "M0710","M0700","M0677","M0297","M0301","M0702","M0647","M0723","M0626","M0739","M1358","M0740","M0741","M0674","M0610","M0733","M0722","M0621","M0253","M0616","M0270","M0086","M0709","M0746","M0660","M0716","M0315","M0283","M0282","M0689","M0666","M0638","M1679","M0261","M0823","M2021","M0699","M0302","M0634","M0734","M0274","M0316","M0259","M0627","M0299","M0269","M0665","M0305","M0742","M0313","M0314","M0087","M1668","M0825","M1684","M0869","M0284","M1682","M0300","M0276","M0684","M072...
    "Zone 5": [ "M0766","M0790","M0791","M0321","M0803","M0331","M0332","M0329","M0330","M0756","M0758","M0322","M1676","M0764","M0324","M0323","M0760","M0328","M0325","M0327","M0762","M0753" ]
  };

  let parkData = JSON.parse(localStorage.getItem(PARK_DATA_KEY) || "{}");
  let parkNames = {};

  function saveData() {
    localStorage.setItem(PARK_DATA_KEY, JSON.stringify(parkData));
  }

  // Build names from GeoJSON features
  function buildNameIndex() {
    if (!window.map) return;
    window.map.eachLayer(function(layer) {
      if (layer && typeof layer.eachLayer === "function") {
        layer.eachLayer(function(featLayer) {
          const f = featLayer.feature;
          if (f && f.properties) {
            const id = f.properties.MowingID || f.properties.UniqueID || f.properties.ID;
            const name = f.properties.Name;
            if (id) {
              parkNames[id] = name || "";
            }
          }
        });
      }
    });
  }

  function renderSidebar() {
    const sidebar = document.getElementById("sidebar-content");
    sidebar.innerHTML = "";
    Object.keys(zones).forEach(zone => {
      const zoneDiv = document.createElement("div");
      zoneDiv.className = "zone";
      const header = document.createElement("h3");
      header.innerText = zone;
      // collapsed by default
      const list = document.createElement("div");
      list.classList.add("hidden");
      header.onclick = () => list.classList.toggle("hidden");
      zoneDiv.appendChild(header);

      zones[zone].forEach(parkId => {
        const item = document.createElement("div");
        item.className = "park-item";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = parkData[parkId]?.done || false;
        checkbox.onchange = () => {
          parkData[parkId] = parkData[parkId] || {};
          parkData[parkId].done = checkbox.checked;
          parkData[parkId].time = new Date().toISOString();
          saveData();
        };
        const label = document.createElement("span");
        const nm = parkNames[parkId] ? " - " + parkNames[parkId] : "";
        label.innerText = parkId + nm;
        label.className = "park-label";
        label.onclick = () => zoomToPark(parkId);
        const note = document.createElement("input");
        note.type = "text";
        note.value = parkData[parkId]?.note || "";
        note.placeholder = "Notes...";
        note.onchange = () => {
          parkData[parkId] = parkData[parkId] || {};
          parkData[parkId].note = note.value;
          saveData();
        };
        item.appendChild(checkbox);
        item.appendChild(label);
        item.appendChild(note);
        list.appendChild(item);
      });
      zoneDiv.appendChild(list);
      sidebar.appendChild(zoneDiv);
    });
  }

  function zoomToPark(parkId) {
    if (!window.map) return;
    window.map.eachLayer(function(layer) {
      if (layer && typeof layer.eachLayer === "function") {
        layer.eachLayer(function(featLayer) {
          const f = featLayer.feature;
          if (f && f.properties) {
            const id = f.properties.MowingID || f.properties.UniqueID || f.properties.ID;
            if (id === parkId) {
              if (featLayer.getBounds) {
                map.fitBounds(featLayer.getBounds());
              } else if (featLayer.getLatLng) {
                map.setView(featLayer.getLatLng(), 18);
              }
            }
          }
        });
      }
    });
  }

  // Admin functions stay the same as before
  window.adminLogin = function() {
    const pwd = prompt("Enter admin password:");
    if (pwd === ADMIN_PASSWORD) {
      document.getElementById("admin-tools").style.display = "block";
    } else {
      alert("Wrong password!");
    }
  };

  // Collapsible sidebar
  window.toggleSidebar = function() {
    const sb = document.getElementById("sidebar");
    sb.classList.toggle("collapsed");
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sb.classList.contains("collapsed"));
  };

  // Init
  window.addEventListener("load", function() {
    if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true") {
      document.getElementById("sidebar").classList.add("collapsed");
    }
    setTimeout(() => {
      buildNameIndex();
      renderSidebar();
    }, 1200);
  });
})();
