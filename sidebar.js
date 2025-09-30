(function() {
  const ADMIN_PASSWORD = "Fishing101!";
  const PARK_DATA_KEY = "parkData";

  let parkData = JSON.parse(localStorage.getItem(PARK_DATA_KEY) || "{}");
  let nameIndex = {};

  function saveData() {
    localStorage.setItem(PARK_DATA_KEY, JSON.stringify(parkData));
  }

  function extractField(props, field) {
    if (!props) return "";
    const direct = props[field] || props[field.toLowerCase()] || props[field.toUpperCase()];
    if (direct) return direct;
    let desc = props.description;
    if (desc && typeof desc === "object" && desc.value) desc = desc.value;
    if (typeof desc === "string") {
      const rx = new RegExp("<td>"+field+"</td><td>(.*?)</td>", "i");
      const m = rx.exec(desc);
      if (m) return m[1].trim();
    }
    return "";
  }

  function buildNameIndex() {
    if (!window.map || typeof map.eachLayer !== "function") return;
    map.eachLayer(function(layer) {
      if (layer && typeof layer.eachLayer === "function") {
        try {
          layer.eachLayer(function(fl) {
            const f = fl.feature;
            if (f && f.properties) {
              const id = extractField(f.properties, "MowingID") || extractField(f.properties, "UniqueID") || f.properties.ID;
              const nm = extractField(f.properties, "Name") || f.properties.name || "";
              if (id) nameIndex[id] = nm || "";
            }
          });
        } catch(e) {} 
      }
    });
  }

  // Admin login
  window.adminLogin = function() {
    const pwd = prompt("Enter admin password:");
    if (pwd === ADMIN_PASSWORD) {
      const tools = document.getElementById("admin-tools");
      if (tools) tools.style.display = "block";
    } else {
      alert("Wrong password!");
    }
  };

  // Show today's completed parks
  window.showToday = function() {
    let today = new Date().toISOString().slice(0,10);
    let doneToday = Object.entries(parkData).filter(([id, d]) => d.done && d.time && d.time.startsWith(today));

    let html = `
      <div style="text-align:center;">
        <img src="logo.png" alt="Bayside Slashing" style="max-width:200px; margin-bottom:20px;">
        <h2>Completed Parks - ${today}</h2>
      </div>
      <table border="1" style="width:100%; border-collapse:collapse;">
        <tr><th>ID</th><th>Name</th><th>Note</th><th>Time</th></tr>
    `;

    doneToday.forEach(([id,d]) => {
      html += `<tr><td>${id}</td><td>${nameIndex[id]||""}</td><td>${d.note||""}</td><td>${d.time}</td></tr>`;
    });

    html += "</table>";
    let w = window.open("", "_blank");
    w.document.write(html);
    w.print();
  };

  // Export full data to PDF
  window.exportPDF = function() {
    let today = new Date().toISOString().slice(0,10);
    let rows = Object.entries(parkData).map(([id,d]) =>
      `<tr><td>${id}</td><td>${nameIndex[id]||""}</td><td>${d.done?"✔":""}</td><td>${d.note||""}</td><td>${d.time||""}</td></tr>`
    ).join("");

    let html = `
      <div style="text-align:center;">
        <img src="logo.png" alt="Bayside Slashing" style="max-width:200px; margin-bottom:20px;">
        <h2>Park Data - ${today}</h2>
      </div>
      <table border="1" style="width:100%; border-collapse:collapse;">
        <tr><th>ID</th><th>Name</th><th>Done</th><th>Note</th><th>Time</th></tr>
        ${rows}
      </table>
    `;

    let w = window.open("", "_blank");
    w.document.write(html);
    w.document.title = "parks_"+today+".pdf";
    w.print();
  };

  // Export CSV
  window.exportData = function() {
    let today = new Date().toISOString().slice(0,10);
    let csv = "ID,Name,Done,Note,Time\n";
    Object.entries(parkData).forEach(([id,d]) => {
      csv += `${id},"${nameIndex[id]||""}",${d.done},${d.note||""},${d.time||""}\n`;
    });
    let blob = new Blob([csv], {type:"text/csv"});
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "park_data_"+today+".csv";
    a.click();
  };

  // Clear user data
  window.clearUserData = function() {
    if (confirm("Clear all user data?")) {
      parkData = {};
      saveData();
      const sb = document.getElementById("sidebar-content");
      if (sb) sb.innerHTML = "";
    }
  };

  // Build name index when page loads
  window.addEventListener("load", function() {
    setTimeout(() => { buildNameIndex(); }, 1200);
  });
})();