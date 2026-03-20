// Game configuration and state variables
const GOAL_CANS = 25;        // Total items needed to collect for achievement
const WIN = 20;              // Win condition stays fixed across difficulties
let currentCans = 0;         // Current number of items collected
let gameActive = false;      // Tracks if game is currently running
let spawnInterval;          // Holds the interval for spawning items
//added variables
const DIFFICULTY_SETTINGS = {
  easy: { label: 'Easy', timeLimit: 10 },
  medium: { label: 'Medium', timeLimit: 7 },
  hard: { label: 'Hard', timeLimit: 5 }
};

let currentDifficultyKey = 'medium';
const timerDisplay = document.getElementById('timer');
const startButton = document.getElementById('start-game');
const scoreDisplay = document.getElementById('current-cans');
const difficultySelect = document.getElementById('difficulty-select');
const winMessage = ["Great job! You collected all the water cans!",
                    "Congratulations! You've reached your goal!",
                    "Well done! You've collected all the water cans!"];
const loseMessage = ["Time's up! Better luck next time!",
                     "Game over! Try again to collect all the water cans!",
                     "Oh no! You ran out of time!"];

let endGameMessage = ""; // Variable to hold the end game message
let outcomeClass = ""; // Variable to hold the outcome class
let secondsLeft = DIFFICULTY_SETTINGS[currentDifficultyKey].timeLimit;
let timerInterval; // Variable to hold the timer interval
let isGameRunning = false; // Flag to track if the game is currently running
const instructionsToggle = document.getElementById('instructions-toggle');
const instructionsPanel = document.getElementById('instructions-panel');
const progressFill = document.getElementById('progress-fill');
const badgeContainer = document.querySelector('.badge-container');
const shareGameBtn = document.getElementById('share-game');
const shareStatus = document.getElementById('share-status');

const BADGES_CSV_PATH = 'img/badges/badges.csv';
const BADGES_IMAGE_BASE_PATH = 'img/badges';
const LEGACY_BADGE_PROGRESS_STORAGE_KEY = 'waterQuestBadgeProgressV1';
const BADGE_PROGRESS_STORAGE_KEY = 'waterQuestBadgeProgressV2';

const BADGE_IDS = {
  EASY_COMPLETE: '1',
  MEDIUM_20: '2',
  HARD_25: '3',
  PERFECT_ACCURACY: '5',
  TOTAL_100: '6',
  SHARED_GAME: '7',
  TEN_GAMES_SESSION: '8',
  OPENED_INSTRUCTIONS: '9',
  WIN_STREAK_3: '10'
};

let allBadges = [];
let currentAchievementIndex = 0;
let unlockedBadges = new Set();
let totalCansLifetime = 0;
let gamesPlayedThisSession = 0;
let currentWinStreak = 0;
let roundMisses = 0;

function loadBadgeProgress() {
  try {
    // Reset legacy unlock state from older builds so badges start locked by default.
    localStorage.removeItem(LEGACY_BADGE_PROGRESS_STORAGE_KEY);

    const raw = localStorage.getItem(BADGE_PROGRESS_STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.unlockedBadges)) {
      unlockedBadges = new Set(parsed.unlockedBadges.map((id) => String(id)));
    }

    if (Number.isFinite(parsed.totalCansLifetime)) {
      totalCansLifetime = parsed.totalCansLifetime;
    }
  } catch (error) {
    console.error('Unable to load badge progress.', error);
  }
}

function saveBadgeProgress() {
  try {
    localStorage.setItem(
      BADGE_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        unlockedBadges: [...unlockedBadges],
        totalCansLifetime
      })
    );
  } catch (error) {
    console.error('Unable to save badge progress.', error);
  }
}

function isBadgeUnlocked(badgeId) {
  return unlockedBadges.has(String(badgeId));
}

function unlockBadge(badgeId) {
  const normalizedBadgeId = String(badgeId);
  if (unlockedBadges.has(normalizedBadgeId)) return;

  unlockedBadges.add(normalizedBadgeId);
  saveBadgeProgress();

  if (allBadges.length > 0) {
    renderBadges(allBadges);
    renderAchievementSlide();
  }
}

function evaluateSessionBadges() {
  if (totalCansLifetime >= 100) {
    unlockBadge(BADGE_IDS.TOTAL_100);
  }

  if (gamesPlayedThisSession >= 10) {
    unlockBadge(BADGE_IDS.TEN_GAMES_SESSION);
  }

  if (currentWinStreak >= 3) {
    unlockBadge(BADGE_IDS.WIN_STREAK_3);
  }
}

function evaluateRoundBadges() {
  if (currentDifficultyKey === 'easy') {
    unlockBadge(BADGE_IDS.EASY_COMPLETE);
  }

  if (currentDifficultyKey === 'medium' && currentCans >= 20) {
    unlockBadge(BADGE_IDS.MEDIUM_20);
  }

  if (currentDifficultyKey === 'hard' && currentCans >= 25) {
    unlockBadge(BADGE_IDS.HARD_25);
  }

  if (roundMisses === 0) {
    unlockBadge(BADGE_IDS.PERFECT_ACCURACY);
  }

  evaluateSessionBadges();
}

function getProgressColor(percent) {
  return {r: 46, g: 157, b: 247}; 
}

function updateProgressBar() {
  if (!progressFill) return;

  const progressPercent = Math.min((currentCans / WIN) * 100, 100);
  progressFill.style.height = `${progressPercent}%`;
  progressFill.style.backgroundColor = getProgressColor(progressPercent);
}

function applyDifficultySettings(difficultyKey) {
  const settings = DIFFICULTY_SETTINGS[difficultyKey] || DIFFICULTY_SETTINGS.medium;

  currentDifficultyKey = difficultyKey in DIFFICULTY_SETTINGS ? difficultyKey : 'medium';
  secondsLeft = settings.timeLimit;

  timerDisplay.textContent = settings.timeLimit;
}

const grid = document.querySelector('.game-grid');
grid.addEventListener('click', function(event) {
 
  if (event.target.classList.contains('water-can')){
    currentCans += 1; // Increment the count of collected items
    scoreDisplay.textContent = currentCans; // Update the score 
    // display
    updateProgressBar();

    event.target.removeEventListener('click', arguments.callee); // Remove click listener to prevent multiple counts from the same item
    return;
  }

  if (!gameActive) {
    return;
  }

  const clickedInsideCell = event.target.closest('.grid-cell');
  if (clickedInsideCell) {
    roundMisses += 1;
  }
});



//added functions
function updateTimer() {
  secondsLeft--; // Decrease the timer by one second
  timerDisplay.textContent = secondsLeft; // Update the timer display
  if (secondsLeft <= 0) {
    secondsLeft = 0; // Ensure the timer doesn't go below zero
    timerDisplay.textContent = secondsLeft; // Update the timer display to show zero
    endGame(); // End the game when time runs out
  }
}
function checkWinCondition() {
  if(currentCans >= WIN){
    endGameMessage = winMessage[Math.floor(Math.random() * winMessage.length)];
    outcomeClass = "win";
    if(currentCans >= GOAL_CANS){
      confetti({
        particleCount: 500,
        spread: 150,
        origin: {x: 0.75, y: 0.4 }
      });
      confetti({
        particleCount: 500,
        spread: 150,
        origin: {x: 0.25, y: 0.4 }
      });
    }else if(currentCans >= WIN){
      confetti({
        particleCount: 250,
        spread: 150,
        origin: { y: 0.4 }
      });
    }
  }else{
    endGameMessage = loseMessage[Math.floor(Math.random() * loseMessage.length)];
    outcomeClass = "lose";
  }

  const existingOverlay = grid.querySelector('.end-game-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  const overlay = document.createElement('div');
  overlay.className = `end-game-overlay ${outcomeClass}`;
  overlay.innerHTML = `<h2>${endGameMessage}</h2>`;
  grid.appendChild(overlay);
  
}
function handleButtonClick() {
  if(!isGameRunning){
    startButton.textContent = "Restart Game";
    isGameRunning = true;
  }
  startGame();
}

//pre-made functions 
// Creates the 3x3 game grid where items will appear
function createGrid() {

  grid.innerHTML = ''; // Clear any existing grid cells
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell'; // Each cell represents a grid square
    grid.appendChild(cell);
  }
}

// Ensure the grid is created when the page loads
createGrid();

// Spawns a new item in a random grid cell
function spawnWaterCan() {
  if (!gameActive) return; // Stop if the game is not active
  const cells = document.querySelectorAll('.grid-cell');
  
  // Clear all cells before spawning a new water can
  cells.forEach(cell => (cell.innerHTML = ''));

  // Select a random cell from the grid to place the water can
  const randomCell = cells[Math.floor(Math.random() * cells.length)];

  // Use a template literal to create the wrapper and water-can element
  randomCell.innerHTML = `
    <div class="water-can-wrapper">
      <div class="water-can"></div>
    </div>
  `;
}

// Initializes and starts a new game
function startGame() {
  //console.log("timer: " + secondsLeft); // Debugging log to confirm game start
  clearInterval(spawnInterval); // Clear any existing spawn intervals
  clearInterval(timerInterval); // Clear any existing timer intervals
  if (progressFill) {
    progressFill.style.height = '0%';
    progressFill.style.backgroundColor = '#2E9DF7';
  }
  applyDifficultySettings(currentDifficultyKey);

  //if (gameActive) return; // Prevent starting a new game if one is already active
  gameActive = true;
  currentCans = 0; // Reset collected items count
  secondsLeft = DIFFICULTY_SETTINGS[currentDifficultyKey].timeLimit;
  roundMisses = 0;
  gamesPlayedThisSession += 1;

  timerDisplay.textContent = secondsLeft; // Update the timer display
  scoreDisplay.textContent = currentCans; // Update the score display
  createGrid(); // Set up the game grid

  spawnInterval = setInterval(spawnWaterCan, 1000);
  timerInterval = setInterval(updateTimer, 1000); // Start the timer countdown
}
function endGame() {
  gameActive = false; // Mark the game as inactive
  clearInterval(spawnInterval); // Stop spawning water cans
  clearInterval(timerInterval); // Stop the timer
  totalCansLifetime += currentCans;
  saveBadgeProgress();

  const didWinRound = currentCans >= WIN;
  if (didWinRound) {
    currentWinStreak += 1;
  } else {
    currentWinStreak = 0;
  }

  evaluateRoundBadges();
  checkWinCondition(); // Check if the player met the win condition
}

function toggleInstructions() {
  // Check if it is currently expanded
  const isExpanded = instructionsToggle.getAttribute('aria-expanded') === 'true';
  
  // Flip the state
  const newExpandedState = !isExpanded;
  
  // Update the button attribute
  instructionsToggle.setAttribute('aria-expanded', String(newExpandedState));
  
  // The panel is hidden ONLY when expanded is false
  instructionsPanel.hidden = isExpanded; 

  if (newExpandedState) {
    unlockBadge(BADGE_IDS.OPENED_INSTRUCTIONS);
  }
}

function handleDifficultyChange(event) {
  applyDifficultySettings(event.target.value);
}

function openAchievementModal() {
  if (allBadges.length === 0) return;
  const modal = document.getElementById('achievement-modal');
  modal.hidden = false;
  currentAchievementIndex = 0;
  renderAchievementSlide();
}

function closeAchievementModal() {
  const modal = document.getElementById('achievement-modal');
  modal.hidden = true;
}

function renderAchievementSlide() {
  if (allBadges.length === 0) return;
  
  const badge = allBadges[currentAchievementIndex];
  const slide = document.getElementById('achievement-slide');
  const unlocked = isBadgeUnlocked(badge.id);
  const badgeStateLabel = unlocked ? 'Unlocked' : 'Locked';
  
  slide.innerHTML = `
    <div class="achievement-detail">
      <img src="${BADGES_IMAGE_BASE_PATH}/badge ${badge.id}.png" alt="${badge.name}" class="achievement-detail-image ${unlocked ? '' : 'is-locked'}">
      <h2>${badge.name}</h2>
      <p class="achievement-detail-status">${badgeStateLabel}</p>
      <p class="achievement-detail-context">${badge.context}</p>
      <p class="achievement-detail-fact">${badge.fact}</p>
    </div>
  `;
  
  document.getElementById('achievement-counter').textContent = currentAchievementIndex + 1;
  document.getElementById('achievement-total').textContent = allBadges.length;
}

function nextAchievement() {
  if (allBadges.length === 0) return;
  currentAchievementIndex = (currentAchievementIndex + 1) % allBadges.length;
  renderAchievementSlide();
}

function prevAchievement() {
  if (allBadges.length === 0) return;
  currentAchievementIndex = (currentAchievementIndex - 1 + allBadges.length) % allBadges.length;
  renderAchievementSlide();
}

async function handleShareGame() {
  const shareData = {
    title: 'Water Quest',
    text: 'Play Water Quest and learn about charity: water!',
    url: window.location.href
  };

  if (shareStatus) {
    shareStatus.textContent = '';
  }

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      unlockBadge(BADGE_IDS.SHARED_GAME);
      if (shareStatus) {
        shareStatus.textContent = 'Thanks for sharing!';
      }
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareData.url);
      unlockBadge(BADGE_IDS.SHARED_GAME);
      if (shareStatus) {
        shareStatus.textContent = 'Game link copied to clipboard.';
      }
      return;
    }

    if (shareStatus) {
      shareStatus.textContent = `Copy this link to share: ${shareData.url}`;
    }
  } catch (error) {
    if (shareStatus) {
      shareStatus.textContent = 'Unable to share right now. Please try again.';
    }
    console.error(error);
  }
}

function parseCsvLine(line) {
  const fields = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      fields.push(currentField.trim());
      currentField = '';
      continue;
    }

    currentField += char;
  }

  fields.push(currentField.trim());
  return fields;
}

function renderBadges(badges) {
  if (!badgeContainer) return;

  badgeContainer.innerHTML = '';

  badges.forEach((badge) => {
    const unlocked = isBadgeUnlocked(badge.id);

    const card = document.createElement('article');
    card.className = `badge-card ${unlocked ? 'is-unlocked' : 'is-locked'}`;
    card.tabIndex = 0;

    const image = document.createElement('img');
    image.className = 'badge-image';
    image.src = `${BADGES_IMAGE_BASE_PATH}/badge ${badge.id}.png`;
    image.alt = badge.name;
    image.loading = 'lazy';

    const label = document.createElement('p');
    label.className = 'badge-name';
    label.textContent = badge.name;

    const context = document.createElement('p');
    context.className = 'badge-context';
    context.textContent = badge.context || 'Game context coming soon.';

    const status = document.createElement('p');
    status.className = 'badge-status';
    status.textContent = unlocked ? 'Unlocked' : 'Locked';

    card.title = badge.fact;
    card.appendChild(image);
    card.appendChild(label);
    card.appendChild(status);
    card.appendChild(context);
    badgeContainer.appendChild(card);
  });
}

async function loadBadges() {
  if (!badgeContainer) return;

  try {
    const response = await fetch(BADGES_CSV_PATH);
    if (!response.ok) {
      throw new Error(`Unable to load badges: ${response.status}`);
    }

    const csvText = await response.text();
    const rows = csvText
      .split(/\r?\n/)
      .filter((row) => row.trim().length > 0)
      .slice(1);

    const badges = rows.map((row, index) => {
      const columns = parseCsvLine(row);
      const badgeId = columns[0].replace(/\D/g, '') || String(index + 1);

      return {
        id: badgeId,
        name: columns[1] || `Badge ${index + 1}`,
        context: columns[2] || '',
        fact: columns[3] || ''
      };
    });

    allBadges = badges;
    renderBadges(badges);
    renderAchievementSlide();
  } catch (error) {
    badgeContainer.innerHTML = '<p class="badge-error">Badges could not be loaded.</p>';
    console.error(error);
  }
}

// Set up click handler for the start button
document.getElementById('start-game').addEventListener('click', handleButtonClick);
if (difficultySelect) {
  difficultySelect.addEventListener('change', handleDifficultyChange);
}
if (instructionsToggle && instructionsPanel) {
  instructionsToggle.addEventListener('click', toggleInstructions);
}

const viewAchievementsBtn = document.getElementById('view-achievements');
const closeAchievementBtn = document.getElementById('close-achievement-modal');
const prevAchievementBtn = document.getElementById('prev-achievement');
const nextAchievementBtn = document.getElementById('next-achievement');
const achievementModal = document.getElementById('achievement-modal');

if (viewAchievementsBtn) {
  viewAchievementsBtn.addEventListener('click', openAchievementModal);
}
if (closeAchievementBtn) {
  closeAchievementBtn.addEventListener('click', closeAchievementModal);
}
if (prevAchievementBtn) {
  prevAchievementBtn.addEventListener('click', prevAchievement);
}
if (nextAchievementBtn) {
  nextAchievementBtn.addEventListener('click', nextAchievement);
}

if (achievementModal) {
  achievementModal.addEventListener('click', (event) => {
    if (event.target === achievementModal) {
      closeAchievementModal();
    }
  });
}

if (shareGameBtn) {
  shareGameBtn.addEventListener('click', handleShareGame);
}

loadBadgeProgress();
applyDifficultySettings(currentDifficultyKey);
loadBadges();
