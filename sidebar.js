
(function() {
  const ADMIN_PASSWORD = "Fishing101!";
  const SIDEBAR_COLLAPSED_KEY = "sidebarCollapsed";
  const PARK_DATA_KEY = "parkData";

  // Zones defined as newline-separated strings -> arrays
  const zoneStrings = {
    "Zone 1": `M0123\nM0427\nM0402`,
    // ... keep all your existing zone definitions here ...
  };

  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("sidebar-toggle");

  // Restore collapsed state from localStorage
  if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true") {
    sidebar.classList.add("collapsed");
  }

  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebar.classList.contains("collapsed"));
  });

  // Build the sidebar content dynamically
  for (const [zoneName, zoneData] of Object.entries(zoneStrings)) {
    const zoneDiv = document.createElement("div");
    zoneDiv.className = "zone";

    const header = document.createElement("h3");
    header.textContent = zoneName;
    zoneDiv.appendChild(header);

    const parkIds = zoneData.trim().split(/\n+/);
    parkIds.forEach(parkId => {
      if (parkId.trim() === "") return;
      const parkElement = document.createElement("div");
      parkElement.className = "park-link"; // ✅ Styled hyperlink
      parkElement.textContent = parkId;
      parkElement.onclick = () => {
        if (typeof zoomToPark === "function") {
          zoomToPark(parkId);
        } else {
          console.warn("zoomToPark function not defined");
        }
      };
      zoneDiv.appendChild(parkElement);
    });

    sidebar.appendChild(zoneDiv);
  }
})();
