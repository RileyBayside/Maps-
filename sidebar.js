
// Sidebar JS adjustments
document.addEventListener("DOMContentLoaded", function() {
    // Convert park numbers and locations into clickable links
    document.querySelectorAll(".park-item").forEach(function(item) {
        item.style.cursor = "pointer";
        item.addEventListener("click", function() {
            var targetId = this.getAttribute("data-target");
            if (targetId && window.zoomToLocation) {
                zoomToLocation(targetId);
            }
        });
    });
});
