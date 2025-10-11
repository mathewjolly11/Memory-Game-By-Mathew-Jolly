const landing = document.getElementById("landing");
const game = document.getElementById("game");
const leaderboard = document.getElementById("leaderboard");
const gameBoard = document.getElementById("gameBoard");
const startBtn = document.getElementById("startBtn");
const backBtn = document.getElementById("backBtn");
const levelSelect = document.getElementById("levelSelect");
const scoreDisplay = document.getElementById("score");
const playerNameInput = document.getElementById("playerName");
const leaderboardList = document.getElementById("leaderboardList");
const showLeaderboardBtn = document.getElementById("showLeaderboardBtn");

let score = 0, cards = [], flipped = [], playerName = "", seconds = 0;
let timerInterval;
const ADMIN_SECRET = "RUSH2025"; // 🔐 Secret code

function showSection(section) {
  [landing, game, leaderboard].forEach(s => s.style.display = "none");
  section.style.display = "flex";
}

function showLanding() { showSection(landing); }

function startTimer() {
  seconds = 0;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    seconds++;
    document.getElementById("time").textContent = formatTime(seconds);
  }, 1000);
}

function stopTimer() { clearInterval(timerInterval); }

function formatTime(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

// Game Board
function createBoard(level) {
  gameBoard.innerHTML = "";
  let pairs;
  switch(level) {
    case "easy": pairs = 4; break;
    case "medium": pairs = 6; break;
    case "hard": pairs = 8; break;
    case "expert": pairs = 10; break;
    case "legend": pairs = 12; break;
    default: pairs = 4;
  }
  let symbols = ["🍎","🍌","🍇","🍒","🍉","🥝","🍋","🍑","🍓","🍍","🍈","🍏","🍐","🍊","🍔","🍕","🍦","🍩","🍪","🍫","🍿","🍭","🍬","🍯"].slice(0,pairs);
  cards = [...symbols, ...symbols].sort(() => 0.5 - Math.random());
  // Add legend class for legend level
  if(level === "legend") {
    gameBoard.classList.add("legend");
  } else {
    gameBoard.classList.remove("legend");
  }
  gameBoard.style.gridTemplateColumns = `repeat(${Math.ceil(Math.sqrt(pairs*2))}, 80px)`;
  cards.forEach(sym => {
    const card = document.createElement("div");
    card.className = "card" + (level === "legend" ? " legend" : "");
    card.textContent = "?";
    card.dataset.symbol = sym;
    card.addEventListener("click", ()=>flipCard(card));
    gameBoard.appendChild(card);
  });
}

function flipCard(card) {
  if(flipped.length===2 || card.classList.contains("flipped")) return;
  card.classList.add("flipped");
  card.textContent = card.dataset.symbol;
  flipped.push(card);
  if(flipped.length===2) setTimeout(checkMatch, 800);
}

function checkMatch() {
  if(flipped[0].dataset.symbol===flipped[1].dataset.symbol){
    score+=10;
    scoreDisplay.textContent = score;
    flipped=[];
    if(document.querySelectorAll(".card:not(.flipped)").length===0){
      stopTimer();
      saveScore();
      Swal.fire({
        title:"🎉 You Won!",
        html:`Score: ${score}<br>Time: ${formatTime(seconds)}`,
        icon:"success",
        confirmButtonColor:"#00e0ff"
      }).then(()=>showLeaderboard());
    }
  } else {
    flipped.forEach(c=>{
      c.classList.remove("flipped");
      c.textContent="?";
    });
    flipped=[];
  }
}

// Leaderboard
function getLeaderboardKey(level) {
  return `memoryLeaderboard_${level}`;
}

function saveScore(){
  const level = levelSelect.value;
  const key = getLeaderboardKey(level);
  const data = JSON.parse(localStorage.getItem(key))||[];
  data.push({name:playerName, score, time: seconds});
  data.sort((a,b)=>b.score-a.score||a.time-b.time);
  localStorage.setItem(key, JSON.stringify(data.slice(0,10)));
  updateLeaderboard();
}

function updateLeaderboard(){
  const level = levelSelect.value;
  const key = getLeaderboardKey(level);
  const data = JSON.parse(localStorage.getItem(key))||[];
  leaderboardList.innerHTML="";
  if(data.length===0) leaderboardList.innerHTML="<li>No scores yet 😔</li>";
  else data.forEach((p,i)=>{
    const li = document.createElement("li");
    li.textContent = `${i+1}. ${p.name} — ${p.score} pts`;
    leaderboardList.appendChild(li);
  });
}

function showLeaderboard(){ updateLeaderboard(); showSection(leaderboard); }

// Reset Leaderboard with SweetAlert
function resetLeaderboard(){
  Swal.fire({
    title:"Admin Verification 🔒",
    input:"password",
    inputPlaceholder:"Enter secret code",
    showCancelButton:true,
    confirmButtonColor:"#3085d6",
    cancelButtonColor:"#d33",
    preConfirm:code=>{
      if(code!==ADMIN_SECRET) Swal.showValidationMessage("❌ Wrong code!"); else return true;
    }
  }).then(result=>{
    if(result.isConfirmed){
      const level = levelSelect.value;
      const key = getLeaderboardKey(level);
      localStorage.removeItem(key);
      updateLeaderboard();
      Swal.fire({title:"✅ Leaderboard Reset!", icon:"success", timer:2000, showConfirmButton:false});
    }
  });
}

// Leaderboard tab logic
const tabButtons = document.querySelectorAll('.tab-btn');
tabButtons.forEach(btn => {
  btn.addEventListener('click', function() {
    levelSelect.value = btn.dataset.level;
    updateLeaderboard();
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});
if(tabButtons.length) tabButtons[0].classList.add('active');

// Event Listeners
startBtn.onclick = ()=>{
  playerName = playerNameInput.value.trim()||"Player";
  score=0;
  scoreDisplay.textContent=score;
  showSection(game);
  createBoard(levelSelect.value);
  startTimer();
};

backBtn.onclick = ()=>{ stopTimer(); showLanding(); };
levelSelect.onchange = ()=>createBoard(levelSelect.value);
if (showLeaderboardBtn) {
  showLeaderboardBtn.onclick = () => {
    showLeaderboard();
  };
}

updateLeaderboard();
showSection(landing);
