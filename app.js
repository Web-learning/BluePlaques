
// --------------------
// MAP INIT
// --------------------

const map = L.map('map').setView([-26.2041, 28.0473], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let geoLayer = null;

// --------------------
// LOAD SIDEBAR (MARKDOWN)
// --------------------

function loadSidebar() {

  fetch('content/sidebar.md')
    .then(res => res.text())
    .then(md => {
      document.getElementById('sidebar').innerHTML =
        marked.parse(md);
    });

}

// --------------------
// LOAD GEOJSON MAP
// --------------------

function loadMapData() {

  fetch('data/plaques.geojson?cache=' + Date.now())
    .then(res => res.json())
    .then(data => {

      if (geoLayer) {
        map.removeLayer(geoLayer);
      }

      geoLayer = L.geoJSON(data, {

        pointToLayer: (feature, latlng) =>
          L.circleMarker(latlng, {
            radius: 7,
            fillColor: "#1565c0",
            color: "#fff",
            weight: 2,
            fillOpacity: 0.9
          }),

/* popups = clickable heritage database */
        onEachFeature: (feature, layer) => {

          const p = feature.properties || {};

          layer.bindPopup(`
            <h3>${p.name || "Heritage Site"}</h3>
            <p>${p.description || ""}</p>

            ${p.wikipedia ?
              `<a href="${p.wikipedia}" target="_blank">
                Wikipedia
              </a>` : ""
            }
          `);

        }

      }).addTo(map);

      map.fitBounds(geoLayer.getBounds());

    });

}

// --------------------
// AUTO REFRESH (LIVE DATA)
// --------------------

// refresh every 30 seconds (no page reload)
setInterval(loadMapData, 30000);

// initial load
loadSidebar();
loadMapData();
