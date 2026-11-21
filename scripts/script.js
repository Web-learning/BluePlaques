
const PLAQUES_URL =
  "https://raw.githubusercontent.com/Web-learning/BluePlaques/main/data/plaques.json";


const GAME_DURATION = 300;

let plaques = [];
let map;
let markers = [];
let currentIndex = 0;
let score = 0;
let plaquesFound = 0;
let questionsCorrect = 0;
let timeLeft = GAME_DURATION;
let timerInterval = null;
let active = false;
let awaitingQuiz = false;
let answered = false;
let currentQuestion = 0;

const $ = id => document.getElementById(id);

function normalise(value) {
  return String(value || "").trim().toLowerCase();
}

// INITIALISE MAP
function initialiseMap() {
  map = L.map("map").setView([-33.925, 18.424], 12);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: '&copy; OpenStreetMap contributors'
    }
  ).addTo(map);
}

// LOAD PLAQUE DATA FROM GITHUB
async function loadPlaques() {
  $("mapStatus").textContent = "Loading plaque data...";

  try {
    const response = await fetch(PLAQUES_URL);

    if (!response.ok) {
      throw new Error("GitHub data could not be loaded.");
    }

    plaques = await response.json();

    if (!Array.isArray(plaques) || !plaques.length) {
      throw new Error("No plaques found.");
    }

    addMarkers();

    $("mapStatus").textContent =
      plaques.length + " historic plaques loaded";

    $("questionTitle").textContent = "Ready for a plaque?";
    $("questionDescription").textContent =
      plaques.length + " plaques are waiting to be discovered.";

  } catch (error) {
    console.error(error);

    $("mapStatus").textContent = "Data loading error";

    $("questionDescription").textContent =
      "Check your GitHub repository URL and plaques.json file.";
  }
}



// ADD MAP MARKERS
function addMarkers() {

  markers.forEach(marker => map.removeLayer(marker));
  markers = [];

  const bounds = [];

  plaques.forEach((plaque, index) => {

    if (
      !Number.isFinite(Number(plaque.lat)) ||
      !Number.isFinite(Number(plaque.lng))
    ) return;

    const marker = L.marker(
      [Number(plaque.lat), Number(plaque.lng)]
    ).addTo(map);

    marker.bindTooltip(
      "Plaque " + (index + 1)
    );

    marker.on("click", () => {
      selectProperty(index);
    });

    markers[index] = marker;
    bounds.push([plaque.lat, plaque.lng]);

  });

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [35, 35] });
  }
}

// START CHALLENGE
function startGame() {

  if (!plaques.length) {
    $("feedback").textContent =
      "Heritage data has not loaded yet.";
    return;
  }

  clearInterval(timerInterval);

  currentIndex = 0;
  currentQuestion = 0;
  score = 0;
  plaquesFound = 0;
  questionsCorrect = 0;
  timeLeft = GAME_DURATION;
  active = true;
  awaitingQuiz = false;
  answered = false;

  markers.forEach((marker, index) => {
    marker.setIcon(defaultIcon(index + 1));
  });

  $("results").hidden = true;
  $("startButton").hidden = true;
  $("nextButton").hidden = true;
  $("finishButton").hidden = false;

  updateStats();
  updateTimer();
  showRound();

  timerInterval = setInterval(() => {

    timeLeft--;
    updateTimer();

    if (timeLeft <= 0) {
      endGame();
    }

  }, 1000);

}

// NUMBERED MAP ICONS
function defaultIcon(number) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:#1764a0;
      color:white;
      border:2px solid white;
      border-radius:50%;
      width:32px;
      height:32px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:bold;
      box-shadow:0 2px 7px #0005;
    ">${number}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

function completedIcon(number) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:#16a34a;
      color:white;
      border:2px solid white;
      border-radius:50%;
      width:32px;
      height:32px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:bold;
    ">✓</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

// SHOW CURRENT PROPERTY
function showRound() {

  if (!active) return;

  if (currentIndex >= plaques.length) {
    endGame();
    return;
  }

  const plaque = plaques[currentIndex];

  awaitingQuiz = false;
  answered = false;
  currentQuestion = 0;

  $("stage").textContent = "STAGE 1 · LOCATE";

  $("questionTitle").textContent =
    "Find this historic plaque";

  $("questionDescription").textContent =
    plaque.locationClue ||
    "Find the person or place associated with " + plaque.plaqueTitle;

  $("questionArea").innerHTML = `
    <div style="
      background:#eff6ff;
      border-radius:9px;
      padding:14px;
      margin-top:15px;
    ">
      <strong>${escapeHTML(plaque.plaqueTitle)}</strong>
      <p>${escapeHTML(plaque.plaqueDescription || "")}</p>
    </div>
    <p>Click the correct numbered marker on the map.</p>
  `;

  $("feedback").textContent = "";
  $("nextButton").hidden = true;

  map.setView(
    [Number(plaque.lat), Number(plaque.lng)],
    Math.max(map.getZoom(), 13)
  );

}

// SELECT PROPERTY
function selectProperty(index) {

  if (!active || awaitingQuiz) return;

  if (index !== currentIndex) {

    $("feedback").textContent =
      "Not quite! Try another plaque marker.";

    $("feedback").className = "bad";
    return;
  }

  awaitingQuiz = true;
  plaquesFound++;

  markers[index].setIcon(completedIcon(index + 1));

  score += 2;
  updateStats();

  $("feedback").textContent =
    "You located the plaque. Test your plaque knowledge.";

  $("feedback").className = "good";

  showArticle(plaques[index].wikipediaTitle);

  showQuiz();

}

// SHOW MULTIPLE CHOICE QUESTIONS
function showQuiz() {

  const plaque = plaques[currentIndex];

  $("stage").textContent = "STAGE 2 · HISTORY";

  $("questionTitle").textContent =
    "Test your historical knowledge";

  showQuestion();

}

function showQuestion() {

  const plaque = plaques[currentIndex];
  const questions = plaque.questions || [];

  if (currentQuestion >= questions.length) {
    finishRound();
    return;
  }

  const question = questions[currentQuestion];

  answered = false;

  $("questionDescription").textContent =
    "Question " + (currentQuestion + 1) +
    " of " + questions.length;

  $("questionArea").innerHTML = `
    <h3>${escapeHTML(question.question)}</h3>
    ${question.options.map((option, index) => `
      <button class="option"
        data-option="${index}">
        ${escapeHTML(option)}
      </button>
    `).join("")}
  `;

  $("questionArea").querySelectorAll(".option")
    .forEach(button => {
      button.addEventListener("click", () => {
        answerQuestion(Number(button.dataset.option));
      });
    });

}

function answerQuestion(selected) {

  if (answered || !active) return;

  answered = true;

  const plaque = plaques[currentIndex];
  const question = plaque.questions[currentQuestion];

  const buttons = [
    ...$("questionArea").querySelectorAll(".option")
  ];

  buttons.forEach((button, index) => {

    button.disabled = true;

    if (index === question.answer) {
      button.classList.add("correct");
    }

    if (index === selected && index !== question.answer) {
      button.classList.add("incorrect");
    }

  });

  if (selected === question.answer) {

    score += 2;
    questionsCorrect++;

    $("feedback").textContent =
      "✓ Correct! " + (question.explanation || "");

    $("feedback").className = "good";

  } else {

    $("feedback").textContent =
      "Incorrect. " + (question.explanation || "");

    $("feedback").className = "bad";

  }

  updateStats();

  currentQuestion++;

  setTimeout(() => {

    if (!active) return;

    showQuestion();

  }, 1400);

}

// FINISH PROPERTY ROUND
function finishRound() {

  $("stage").textContent = "STAGE 3 · DISCOVER";

  $("questionTitle").textContent =
    "Blue Plaque successfully explored!";

  $("questionDescription").textContent =
    "Read the Wikipedia article below and discover more than this plaque can say.";

  $("questionArea").innerHTML = `
    <p>You've earned your points for this plaque.</p>
    <p>You can continue to the next plaque or explore the article.</p>
  `;

  $("nextButton").hidden = false;
  $("feedback").textContent = "Well done!";
  $("feedback").className = "good";

}

// NEXT PROPERTY
$("nextButton").addEventListener("click", () => {

  if (!active) return;

  currentIndex++;

  if (currentIndex >= plaques.length) {
    endGame();
  } else {
    showRound();
  }

});

// WIKIPEDIA ARTICLE
async function showArticle(title) {

  $("articleContent").textContent =
    "Loading Wikipedia article...";

  $("articleLinks").innerHTML = "";

  if (!title) {
    $("articleContent").textContent =
      "No Wikipedia article has been linked to this plaque.";
    return;
  }

  const articleURL =
    "https://en.wikipedia.org/wiki/" +
    encodeURIComponent(title.replace(/ /g, "_"));

  const apiURL =
    "https://en.wikipedia.org/api/rest_v1/page/summary/" +
    encodeURIComponent(title.replace(/ /g, "_"));

  $("articleLinks").innerHTML = `
    <a href="${articleURL}" target="_blank" rel="noopener">
      Read Wikipedia article ↗
    </a>
    <a href="https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title.replace(/ /g, "_"))}&action=edit"
       target="_blank" rel="noopener">
      Suggest an article improvement ↗
    </a>
  `;

  try {

    const response = await fetch(apiURL);

    if (!response.ok) throw new Error("Article unavailable");

    const article = await response.json();

    const image = article.thumbnail?.source
      ? `<img src="${article.thumbnail.source}" alt="">`
      : "";

    $("articleContent").innerHTML = `
      <h3>${escapeHTML(article.title)}</h3>
      ${image}
      <p>${escapeHTML(article.extract || "No summary available.")}</p>
    `;

  } catch (error) {

    $("articleContent").textContent =
      "Article preview unavailable. You can still open the Wikipedia article using the link above.";

  }

}

// UPDATE SCOREBOARD
function updateStats() {

  $("score").textContent = score;
  $("found").textContent = plaquesFound;
  $("correct").textContent = questionsCorrect;

}

// TIMER
function updateTimer() {

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  $("timer").textContent =
    String(mins).padStart(2, "0") +
    ":" +
    String(secs).padStart(2, "0");

  $("timer").style.color =
    timeLeft <= 30 ? "#fca5a5" : "white";

}


// ======================================
// HERITAGE DISCOVERY PANEL
// ======================================

function showHeritageInfo(plaque) {

  if (!plaque) return;

  const panel = document.getElementById("heritagePanel");

  const photo = document.getElementById("heritagePhoto");
  const placeholder =
    document.getElementById("heritagePhotoPlaceholder");

  // PROPERTY NAME
  document.getElementById("heritageName").textContent =
    plaque.propertyName ||
    plaque.plaqueTitle ||
    plaque.name ||
    "Heritage property";

  // LOCATION
  const location = [
    plaque.city || plaque.town,
    plaque.province,
    "South Africa"
  ].filter(Boolean);

  document.getElementById("heritageLocation").textContent =
    location.join(", ");

  // HISTORICAL BACKGROUND
  document.getElementById("heritageHistory").textContent =
    plaque.historicalBackground ||
    plaque.history ||
    plaque.description ||
    "Historical information has not yet been added.";

  // PHOTOGRAPH
  const imageUrl =
    plaque.imageUrl ||
    plaque.photoUrl ||
    plaque.image ||
    plaque.photo ||
    "";

  photo.hidden = true;
  placeholder.hidden = false;
  photo.removeAttribute("src");

  if (imageUrl && /^https?:\/\//i.test(imageUrl)) {

    photo.onload = () => {
      photo.hidden = false;
      placeholder.hidden = true;
    };

    photo.onerror = () => {
      photo.hidden = true;
      placeholder.hidden = false;
    };

    photo.src = imageUrl;
    photo.alt =
      "Photograph of " +
      (plaque.propertyName || plaque.name || "heritage property");
  }

  // WIKIDATA
  const wikidataLink =
    document.getElementById("heritageWikidata");

  const qid = plaque.wikidataQid || "";

  if (/^Q\d+$/.test(qid)) {

    wikidataLink.href =
      "https://www.wikidata.org/wiki/" + qid;

    wikidataLink.textContent = qid;
    wikidataLink.parentElement.hidden = false;

  } else {

    wikidataLink.parentElement.hidden = true;

  }

  // WIKIPEDIA
  const wikipediaLink =
    document.getElementById("heritageWikipedia");

  let wikipediaUrl = plaque.wikipediaUrl || "";

  if (!/^https:\/\/([a-z0-9-]+\.)?wikipedia\.org\//i.test(wikipediaUrl)) {
    wikipediaUrl = "";
  }

  if (wikipediaUrl) {

    wikipediaLink.href = wikipediaUrl;
    wikipediaLink.textContent = "Read Wikipedia article ↗";
    wikipediaLink.parentElement.hidden = false;

  } else {

    wikipediaLink.parentElement.hidden = true;

  }

  // OPEN PANEL
  panel.open = true;

  panel.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });

}


// RESET PANEL
function hideHeritageInfo() {

  document.getElementById("heritagePanel").open = false;

}


// FINISH GAME
function endGame() {

  if (!active) return;

  active = false;

  clearInterval(timerInterval);

  $("nextButton").hidden = true;
  $("finishButton").hidden = true;
  $("startButton").hidden = false;

  $("results").hidden = false;

  $("finalResults").innerHTML = `
    <h3>${score} points</h3>
    <p>${plaquesFound} plaques identified</p>
    <p>${questionsCorrect} history questions answered correctly</p>
    <p>${plaques.length} plaques in this challenge</p>
  `;

  $("questionTitle").textContent = "Challenge complete!";
  $("questionDescription").textContent =
    "Thank you for exploring our heritage.";

}



// SAFE TEXT
function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// BUTTONS
$("startButton").addEventListener("click", startGame);
$("finishButton").addEventListener("click", endGame);
$("restartButton").addEventListener("click", startGame);

// INITIALISE
initialiseMap();
loadPlaques();
