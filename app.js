const map = L.map('map').setView([-29, 24], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let currentLayer = null;

// -----------------------------
// CITY DATA MAP
// -----------------------------

const cityFiles = {
  johannesburg: "data/johannesburg.geojson",
  middelburg: "data/middelburg.geojson",
  capetown: "data/capetown.geojson"
};

// -----------------------------
// LOAD GEOJSON
// -----------------------------

async function loadCity(city) {

  const res = await fetch(cityFiles[city] + "?t=" + Date.now());
  const data = await res.json();

  if (currentLayer) {
    map.removeLayer(currentLayer);
  }

  currentLayer = L.geoJSON(data, {

    pointToLayer: (feature, latlng) =>
      L.circleMarker(latlng, {
        radius: 6,
        fillColor: "#1565c0",
        color: "#fff",
        weight: 2,
        fillOpacity: 0.9
      }),

/* FILTERING + POPUPS */
    filter: (feature) => {

      const selected = document.getElementById("categoryFilter").value;

      if (selected === "all") return true;

      return feature.properties.category === selected;

    },

    onEachFeature: async (feature, layer) => {

      const p = feature.properties;

      const img = await getWikimediaImage(p.wikipedia);

      layer.bindPopup(`
        <div>
          <h3>${p.name || "Site"}</h3>
          <p>${p.description || ""}</p>

          ${img ? `<img class="popup-image" src="${img}">` : ""}

          ${p.wikipedia ?
            `<a href="${p.wikipedia}" target="_blank">
              Wikipedia
            </a>` : ""
          }
        </div>
      `);

    }

  }).addTo(map);

  map.fitBounds(currentLayer.getBounds());

}

// -----------------------------
// WIKIMEDIA COMMONS IMAGE FETCH
// -----------------------------

async function getWikimediaImage(wikiUrl) {

  if (!wikiUrl) return null;

  try {

    const title = wikiUrl.split("/wiki/")[1];

    const api = `https://en.wikipedia.org/api/rest_v1/page/media-list/${title}`;

    const res = await fetch(api);
    const data = await res.json();

    const file = data.items.find(i => i.type === "image");

    return file ? file.src : null;

  } catch (e) {
    return null;
  }

}

// -----------------------------
// EVENT LISTENERS
// -----------------------------

document.getElementById("citySelect").addEventListener("change", (e) => {
  loadCity(e.target.value);
});

document.getElementById("categoryFilter").addEventListener("change", () => {
  loadCity(document.getElementById("citySelect").value);
});

// -----------------------------
// INITIAL LOAD
// -----------------------------

loadCity("johannesburg");
