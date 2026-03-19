// Game configuration and state variables
const GOAL_CANS = 25;        // Total items needed to collect for achievement
let currentCans = 0;         // Current number of items collected
let gameActive = false;      // Tracks if game is currently running
let spawnInterval;          // Holds the interval for spawning items
//added variables
const WIN = 20; // Win condition based on the goal
const timerDisplay = document.getElementById('timer');
const startButton = document.getElementById('start-game');
const originalTimer = parseInt(document.getElementById('timer').textContent); // Store the original timer value for resetting
const scoreDisplay = document.getElementById('current-cans');
const winMessage = ["Great job! You collected all the water cans!",
                    "Congratulations! You've reached your goal!",
                    "Well done! You've collected all the water cans!"];
const loseMessage = ["Time's up! Better luck next time!",
                     "Game over! Try again to collect all the water cans!",
                     "Oh no! You ran out of time!"];

let endGameMessage = ""; // Variable to hold the end game message
let outcomeClass = ""; // Variable to hold the outcome class
let secondsLeft = parseInt(timerDisplay.textContent); // Get initial time from the timer element
let timerInterval; // Variable to hold the timer interval
let isGameRunning = false; // Flag to track if the game is currently running
const instructionsToggle = document.getElementById('instructions-toggle');
const instructionsPanel = document.getElementById('instructions-panel');

const grid = document.querySelector('.game-grid');
grid.addEventListener('click', function(event) {
  if (event.target.classList.contains('water-can')){
    currentCans += 1; // Increment the count of collected items
    scoreDisplay.textContent = currentCans; // Update the score display
    event.target.removeEventListener('click', arguments.callee); // Remove click listener to prevent multiple counts from the same item
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
  grid.innerHTML = `<div class="end-game-overlay ${outcomeClass}"><h2>${endGameMessage}</h2></div>`;
  
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
  //console.log("original timer: " + originalTimer); // Debugging log to confirm game start
  clearInterval(spawnInterval); // Clear any existing spawn intervals
  clearInterval(timerInterval); // Clear any existing timer intervals

  //if (gameActive) return; // Prevent starting a new game if one is already active
  gameActive = true;
  currentCans = 0; // Reset collected items count
  secondsLeft = parseInt(originalTimer); // Reset timer to initial value

  timerDisplay.textContent = secondsLeft; // Update the timer display
  scoreDisplay.textContent = currentCans; // Update the score display
  createGrid(); // Set up the game grid



  spawnInterval = setInterval(spawnWaterCan, 1000); // Spawn water cans every second
  timerInterval = setInterval(updateTimer, 1000); // Start the timer countdown
}
function endGame() {
  gameActive = false; // Mark the game as inactive
  clearInterval(spawnInterval); // Stop spawning water cans
  clearInterval(timerInterval); // Stop the timer
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
}

// Set up click handler for the start button
document.getElementById('start-game').addEventListener('click', handleButtonClick);
if (instructionsToggle && instructionsPanel) {
  instructionsToggle.addEventListener('click', toggleInstructions);
}
