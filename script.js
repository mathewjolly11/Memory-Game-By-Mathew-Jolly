import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-analytics.js";
import { getDatabase, ref, push, query, orderByChild, limitToLast, get, remove } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBg2nNFgDw6f5YdaajOSTVtHNwgrlJ7TD4",
  authDomain: "memory-game-992fa.firebaseapp.com",
  projectId: "memory-game-992fa",
  storageBucket: "memory-game-992fa.firebasestorage.app",
  messagingSenderId: "283078183463",
  appId: "1:283078183463:web:e87d66881e504c2d709c02",
  measurementId: "G-84WYN73QN9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

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
  // Add medium/expert/legend class for those levels
  gameBoard.classList.remove("easy", "medium", "expert", "legend");
  if(level === "easy") gameBoard.classList.add("easy");
  if(level === "medium") gameBoard.classList.add("medium");
  if(level === "expert") gameBoard.classList.add("expert");
  if(level === "legend") gameBoard.classList.add("legend");
  // Force 4 columns for expert/legend on mobile
  if ((level === "expert" || level === "legend") && window.innerWidth <= 600) {
    gameBoard.style.gridTemplateColumns = `repeat(4, 1fr)`;
  } else {
    gameBoard.style.gridTemplateColumns = `repeat(${Math.ceil(Math.sqrt(pairs*2))}, 80px)`;
  }
  cards.forEach(sym => {
    let cardClass = "card";
    if(level === "easy") cardClass += " easy";
    if(level === "medium") cardClass += " medium";
    if(level === "expert") cardClass += " expert";
    if(level === "legend") cardClass += " legend";
    const card = document.createElement("div");
    card.className = cardClass;
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
  saveScoreOnline(level, playerName, score, seconds);
  showLeaderboard();
}

// Firebase integration
// Save score to Firebase
function saveScoreOnline(level, name, score, time) {
  push(ref(db, 'leaderboard/' + level), { name, score, time });
}

// Fetch leaderboard from Firebase
async function fetchLeaderboard(level) {
  const q = query(ref(db, 'leaderboard/' + level), orderByChild('score'), limitToLast(10));
  const snapshot = await get(q);
  const scores = [];
  snapshot.forEach(child => scores.push(child.val()));
  scores.reverse(); // highest first
  return scores;
}

// Reset leaderboard in Firebase
function resetLeaderboardOnline(level) {
  remove(ref(db, 'leaderboard/' + level));
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

function showLeaderboard(){ 
  // Fetch from Firebase and update UI
  const level = levelSelect.value;
  fetchLeaderboard(level).then(scores => {
    leaderboardList.innerHTML = "";
    if(scores.length === 0) {
      leaderboardList.innerHTML = "<li>No scores yet 😔</li>";
    } else {
      scores.forEach((p, i) => {
        const li = document.createElement("li");
        li.textContent = `${i+1}. ${p.name} — ${p.score} pts`;
        leaderboardList.appendChild(li);
      });
    }
  });
  showSection(leaderboard); 
}

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
  resetLeaderboardOnline(level); // Reset in Firebase
  showLeaderboard();
  Swal.fire({title:"✅ Leaderboard Reset!", icon:"success", timer:2000, showConfirmButton:false});
    }
  });
}

// Leaderboard tab logic
const tabButtons = document.querySelectorAll('.tab-btn');
tabButtons.forEach(btn => {
  btn.addEventListener('click', function() {
    levelSelect.value = btn.dataset.level;
    showLeaderboard(); // Always fetch from Firebase
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
// Add event listener for 'Back to Home' button in leaderboard section
const leaderboardBackBtn = leaderboard.querySelector('button[onclick="showLanding()"]');
if (leaderboardBackBtn) {
  leaderboardBackBtn.onclick = () => {
    showLanding();
  };
}

updateLeaderboard();
showSection(landing);
