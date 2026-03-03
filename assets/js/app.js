const map = L.map('map').setView([51.5074, -0.1278], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let markers = [];
let geoData = null;

const grid = document.getElementById("plaqueGrid");
const searchInput = document.getElementById("searchInput");
const accuracyFilter = document.getElementById("accuracyFilter");
const drawer = document.getElementById("drawer");
const drawerContent = document.getElementById("drawerContent");

// Load GeoJSON externally
fetch("assets/data/plaques.geojson")
  .then(res => res.json())
  .then(data => {
    geoData = data;
    renderPlaques();
  });

function renderPlaques() {
  if (!geoData) return;

  grid.innerHTML = "";
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const searchTerm = searchInput.value.toLowerCase();
  const filterValue = accuracyFilter.value;

  geoData.features.forEach(feature => {

    const inscription = feature.properties.inscription;
    const isAccurate = feature.geometry.is_accurate;
    const [lng, lat] = feature.geometry.coordinates;

    if (
      !inscription.toLowerCase().includes(searchTerm) ||
      (filterValue === "accurate" && !isAccurate) ||
      (filterValue === "approximate" && isAccurate)
    ) return;

    const card = document.createElement("div");
    card.className = "plaque-card";
    card.innerHTML = `
      <div class="blue-badge">BLUE</div>
      <h3>${inscription.substring(0, 60)}...</h3>
    `;

    card.onclick = () => {
      map.setView([lat, lng], 15);
      drawerContent.innerHTML = `<p>${inscription}</p>`;
      drawer.classList.add("active");
    };

    grid.appendChild(card);

    const marker = L.marker([lat, lng])
      .addTo(map)
      .bindPopup(inscription);

    markers.push(marker);
  });
}

searchInput.addEventListener("input", renderPlaques);
accuracyFilter.addEventListener("change", renderPlaques);

document.querySelector(".drawer-handle").onclick = () =>
  drawer.classList.remove("active");
