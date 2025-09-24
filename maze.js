const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');

const rows = 20;  
const cols = 20;  
const cellSize = canvas.width / cols;

let grid = [];
let stack = [];

let player = { row: 0, col: 0, speedBoost: 0, boostTimer: 0 };
let exit = { row: rows - 1, col: cols - 1 };
let ai = { row: rows - 1, col: 0, path: [], speed: 0.25, moveCounter: 0 };

let gameMode = 'normal'; // 'normal' or 'aiOpponent'

let paused = false;
let frameCount = 0;

let powerUps = [];

let timer = 120; // seconds
let score = 0;

// -- Maze Cell class, maze generation, draw functions (unchanged, same as previous) --

class Cell {
  constructor(row, col) {
    this.row = row;
    this.col = col;
    this.walls = { top: true, right: true, bottom: true, left: true };
    this.visited = false;
  }

  checkNeighbors() {
    let neighbors = [];

    let top = grid[index(this.row - 1, this.col)];
    let right = grid[index(this.row, this.col + 1)];
    let bottom = grid[index(this.row + 1, this.col)];
    let left = grid[index(this.row, this.col - 1)];

    if (top && !top.visited) neighbors.push(top);
    if (right && !right.visited) neighbors.push(right);
    if (bottom && !bottom.visited) neighbors.push(bottom);
    if (left && !left.visited) neighbors.push(left);

    if (neighbors.length > 0) {
      let r = Math.floor(Math.random() * neighbors.length);
      return neighbors[r];
    } else {
      return undefined;
    }
  }

  draw() {
    const x = this.col * cellSize;
    const y = this.row * cellSize;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;

    if (this.walls.top) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + cellSize, y);
      ctx.stroke();
    }
    if (this.walls.right) {
      ctx.beginPath();
      ctx.moveTo(x + cellSize, y);
      ctx.lineTo(x + cellSize, y + cellSize);
      ctx.stroke();
    }
    if (this.walls.bottom) {
      ctx.beginPath();
      ctx.moveTo(x + cellSize, y + cellSize);
      ctx.lineTo(x, y + cellSize);
      ctx.stroke();
    }
    if (this.walls.left) {
      ctx.beginPath();
      ctx.moveTo(x, y + cellSize);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
}

function index(row, col) {
  if (row < 0 || col < 0 || row >= rows || col >= cols) {
    return -1;
  }
  return row * cols + col;
}

function generateMaze() {
  let current = grid[0];
  current.visited = true;

  stack.push(current);

  while (stack.length > 0) {
    let next = current.checkNeighbors();

    if (next) {
      next.visited = true;

      removeWalls(current, next);

      stack.push(current);

      current = next;
    } else {
      current = stack.pop();
    }
  }
}

function removeWalls(a, b) {
  let x = a.col - b.col;
  if (x === 1) {
    a.walls.left = false;
    b.walls.right = false;
  } else if (x === -1) {
    a.walls.right = false;
    b.walls.left = false;
  }

  let y = a.row - b.row;
  if (y === 1) {
    a.walls.top = false;
    b.walls.bottom = false;
  } else if (y === -1) {
    a.walls.bottom = false;
    b.walls.top = false;
  }
}

function drawMaze() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let cell of grid) {
    cell.draw();
  }

  ctx.fillStyle = 'green';
  ctx.fillRect(exit.col * cellSize + cellSize * 0.25, exit.row * cellSize + cellSize * 0.25, cellSize * 0.5, cellSize * 0.5);

  drawPowerUps();
}

function drawCharacters() {
  // Player in blue, with speed boost glow if active
  ctx.fillStyle = player.speedBoost > 0 ? 'aqua' : 'blue';
  ctx.beginPath();
  ctx.arc(player.col * cellSize + cellSize / 2, player.row * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
  ctx.fill();

  if(gameMode === 'aiOpponent') {
    // AI visual fear effect if close
    const dist = Math.abs(player.row - ai.row) + Math.abs(player.col - ai.col);
    ctx.fillStyle = dist <= 3 ? 'red' : 'darkred';
    ctx.beginPath();
    ctx.arc(ai.col * cellSize + cellSize / 2, ai.row * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();

    if (dist <= 3) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(player.col * cellSize + cellSize / 2, player.row * cellSize + cellSize / 2, cellSize * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function movePlayer(dir) {
  const cell = grid[index(player.row, player.col)];
  let moveSpeed = player.speedBoost > 0 ? 2 : 1;

  for(let step=0; step < moveSpeed; step++) {
    switch (dir) {
      case 'ArrowUp':
        if (!cell.walls.top && player.row > 0) player.row--;
        break;
      case 'ArrowDown':
        if (!cell.walls.bottom && player.row < rows - 1) player.row++;
        break;
      case 'ArrowLeft':
        if (!cell.walls.left && player.col > 0) player.col--;
        break;
      case 'ArrowRight':
        if (!cell.walls.right && player.col < cols - 1) player.col++;
        break;
    }
  }

  checkPowerUp();
  checkGameStatus();
}

function checkGameStatus() {
  if (player.row === exit.row && player.col === exit.col) {
    alert(`You escaped! Score: ${score}`);
    resetGame();
  }

  if (gameMode === 'aiOpponent' && player.row === ai.row && player.col === ai.col) {
    alert(`Caught by AI! Score: ${score}`);
    resetGame();
  }

  if(timer <= 0){
    alert(`Time's up! Score: ${score}`);
    resetGame();
  }
}

function resetGame() {
  player = { row: 0, col: 0, speedBoost: 0, boostTimer: 0 };
  ai = { row: rows - 1, col: 0, path: [], speed: 0.25, moveCounter: 0 };
  timer = 120;
  score = 0;
  powerUps = [];

  for (let cell of grid) {
    cell.visited = false;
    cell.walls = { top: true, right: true, bottom: true, left: true };
  }
  generateMaze();
  placePowerUps();
  if(gameMode === 'aiOpponent'){
    ai.path = findPath(ai, player);
  }
  drawMaze();
  drawCharacters();
  updateScoreBoard();
}

function findPath(start, goal) {
  let openSet = [];
  let closedSet = new Set();
  let cameFrom = new Map();

  function heuristic(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
  }

  function getNeighbors(cell) {
    let neighbors = [];
    let c = grid[index(cell.row, cell.col)];

    if (!c.walls.top) neighbors.push(grid[index(cell.row - 1, cell.col)]);
    if (!c.walls.right) neighbors.push(grid[index(cell.row, cell.col + 1)]);
    if (!c.walls.bottom) neighbors.push(grid[index(cell.row + 1, cell.col)]);
    if (!c.walls.left) neighbors.push(grid[index(cell.row, cell.col - 1)]);
    return neighbors.filter(n => n !== undefined);
  }

  openSet.push({ cell: grid[index(start.row, start.col)], g: 0, f: heuristic(start, goal) });
  let gScore = new Map();
  gScore.set(grid[index(start.row, start.col)], 0);

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    let current = openSet.shift().cell;

    if (current.row === goal.row && current.col === goal.col) {
      let path = [];
      let temp = current;
      while (temp) {
        path.push({ row: temp.row, col: temp.col });
        temp = cameFrom.get(temp);
      }
      return path.reverse();
    }

    closedSet.add(current);

    for (let neighbor of getNeighbors(current)) {
      if (closedSet.has(neighbor)) continue;
      let tentativeG = gScore.get(current) + 1;

      if (!gScore.has(neighbor) || tentativeG < gScore.get(neighbor)) {
        cameFrom.set(neighbor, current);
        gScore.set(neighbor, tentativeG);
        let fScore = tentativeG + heuristic(neighbor, goal);
        if (!openSet.find(n => n.cell === neighbor)) openSet.push({ cell: neighbor, g: tentativeG, f: fScore });
      }
    }
  }

  return [];
}

function moveAI() {
  if(gameMode !== 'aiOpponent') return;
  if (!ai.path || ai.path.length === 0) return;

  ai.moveCounter += ai.speed;
  if (ai.moveCounter < 1) return;
  ai.moveCounter = 0;

  ai.path.shift();
  if (ai.path.length > 0) {
    ai.row = ai.path[0].row;
    ai.col = ai.path[0].col;
  }
}

function updateTimers() {
  if(paused) return;

  frameCount++;
  if(frameCount % 60 === 0 && timer > 0) {
    timer--;
    if(timer % 10 === 0 && ai.speed < 2 && gameMode === 'aiOpponent') ai.speed += 0.05;

    if(player.speedBoost > 0) {
      player.boostTimer--;
      if(player.boostTimer <= 0) player.speedBoost = 0;
    }
  }
}

function placePowerUps() {
  powerUps = [];
  for(let i = 0; i < 5; i++) {
    let pr, pc;
    do {
      pr = Math.floor(Math.random() * rows);
      pc = Math.floor(Math.random() * cols);
    } while ((pr === player.row && pc === player.col) || (pr === exit.row && pc === exit.col));

    powerUps.push({ row: pr, col: pc });
  }
}

function drawPowerUps() {
  ctx.fillStyle = 'yellow';
  for(let p of powerUps) {
    ctx.beginPath();
    ctx.rect(p.col * cellSize + cellSize*0.35, p.row * cellSize + cellSize*0.35, cellSize*0.3, cellSize*0.3);
    ctx.fill();
  }
}

function checkPowerUp() {
  for(let i = 0; i < powerUps.length; i++) {
    let p = powerUps[i];
    if(p.row === player.row && p.col === player.col) {
      powerUps.splice(i,1);
      player.speedBoost = 2;
      player.boostTimer = 180;
      score += 10;
      updateScoreBoard();
      break;
    }
  }
}

function updateScoreBoard() {
  const info = document.getElementById('info');
  info.innerHTML = `
    <div>Time: ${timer}s</div>
    <div>Score: ${score}</div>
    <div>Mode: ${gameMode === 'normal' ? 'Normal Play' : 'AI Opponent'}</div>
    <div>AI Speed: ${gameMode === 'aiOpponent' ? ai.speed.toFixed(2) : 'N/A'}</div>
    <div>Speed Boost: ${player.speedBoost > 0 ? "ON" : "OFF"}</div>
  `;
}

function gameLoop() {
  if(!paused) {
    updateTimers();
    drawMaze();
    drawCharacters();
    moveAI();
    checkGameStatus();
  }
  updateScoreBoard();
  requestAnimationFrame(gameLoop);
}

// Keyboard listener
window.addEventListener('keydown', (e) => {
  if (paused && e.key !== 'p') return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    movePlayer(e.key);
  } else if (e.key === 'p') {
    paused = !paused;
  } else if (e.key === 'r') {
    resetGame();
  }
});

// UI Buttons event handlers - add buttons in your HTML and link these functions to onclick

function setModeNormal() {
  gameMode = 'normal';
  resetGame();
}

function setModeAI() {
  gameMode = 'aiOpponent';
  resetGame();
}

function pauseGame() {
  paused = !paused;
}

function restartGame() {
  resetGame();
}

function init() {
  grid = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid.push(new Cell(r, c));
    }
  }
  generateMaze();
  placePowerUps();
  player = { row: 0, col: 0, speedBoost: 0, boostTimer: 0 };
  ai = { row: rows - 1, col: 0, path: [], speed: 0.25, moveCounter: 0 };
  if(gameMode === 'aiOpponent') {
    ai.path = findPath(ai, player);
  }
  frameCount = 0;
  paused = false;
  timer = 120;
  score = 0;
  gameLoop();
}

init();
