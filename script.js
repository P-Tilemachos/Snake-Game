const canvas = document.getElementById("snakeCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("scoreVal");
const highEl = document.getElementById("highScore");
const overlay = document.getElementById("overlay");
const msgEl = document.getElementById("msg");

let box = 20; 
let score, snake, food, bomb, d, gameLoop;
let changingDirection = false;
let appleCounter = 0; 
let isGoldenApple = false;
let walls = [];
let currentSpeed = 130;
let superModeCounter = 0; 
let particles = []; 
let bgSnakes = []; // Τα φιδάκια του background

let hiScore = localStorage.getItem("googleSnakeHi") || 0;
highEl.innerText = hiScore;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- ΗΧΟΙ ---
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    if (type === 'eat') { osc.frequency.setValueAtTime(600, audioCtx.currentTime); }
    else if (type === 'golden') { osc.frequency.setValueAtTime(900, audioCtx.currentTime); gain.gain.setValueAtTime(0.3, audioCtx.currentTime); }
    else if (type === 'gameover') { osc.frequency.setValueAtTime(100, audioCtx.currentTime); }
    else if (type === 'bomb') { osc.frequency.setValueAtTime(50, audioCtx.currentTime); osc.type = 'sawtooth'; }
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
    osc.start(); osc.stop(audioCtx.currentTime + 0.3);
}

// --- ΕΦΕ ΕΚΡΗΞΗΣ ---
function createParticles(x, y, color) {
    for(let i=0; i<12; i++) {
        particles.push({
            x: x + box/2, y: y + box/2,
            vx: (Math.random()-0.5)*8,
            vy: (Math.random()-0.5)*8,
            life: 25,
            color: color
        });
    }
}

// --- BACKGROUND SNAKES LOGIC ---
function initBGSnakes() {
    bgSnakes = [
        { x: -100, y: 100, vx: 2, vy: 0, color: "rgba(255, 255, 255, 0.08)", length: 6 }, // Οριζόντιο
        { x: 200, y: -100, vx: 0, vy: 2, color: "rgba(70, 114, 243, 0.08)", length: 6 },  // Κάθετο
        { x: -50, y: -50, vx: 1.5, vy: 1.5, color: "rgba(241, 196, 15, 0.08)", length: 6 } // Διαγώνιο
    ];
}

function drawBGSnakes() {
    bgSnakes.forEach((s, index) => {
        // Εμφάνιση ανάλογα με το σκορ
        if (index === 0 && score < 5) return;  // Το 1ο στα 5 μήλα
        if (index === 1 && score < 15) return; // Το 2ο στα 15 μήλα
        if (index === 2 && score < 30) return; // Το 3ο στα 30 μήλα

        ctx.fillStyle = s.color;
        for(let i=0; i<s.length; i++) {
            ctx.fillRect(s.x - (i*s.vx*8), s.y - (i*s.vy*8), 18, 18);
        }
        s.x += s.vx; s.y += s.vy;
        if(s.x > 450) s.x = -50; if(s.x < -50) s.x = 450;
        if(s.y > 450) s.y = -50; if(s.y < -50) s.y = 450;
    });
}

function startGame() {
    score = 0; appleCounter = 0; isGoldenApple = false; walls = []; 
    currentSpeed = 130; superModeCounter = 0; particles = [];
    initBGSnakes();
    bomb = null;
    d = "R"; 
    snake = [{x: 9*box, y: 10*box}, {x: 8*box, y: 10*box}, {x: 7*box, y: 10*box}];
    scoreEl.innerText = score;
    overlay.style.display = "none";
    spawnItems(); 
    if(gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(draw, currentSpeed);
}

document.addEventListener("keydown", e => {
    if (changingDirection) return;
    const key = e.keyCode;
    if (key === 37 && d !== "R") { d = "L"; changingDirection = true; }
    if (key === 38 && d !== "D") { d = "U"; changingDirection = true; }
    if (key === 39 && d !== "L") { d = "R"; changingDirection = true; }
    if (key === 40 && d !== "U") { d = "D"; changingDirection = true; }
});

function spawnItems() {
    appleCounter++;
    isGoldenApple = (appleCounter % 6 === 0);
    food = getRandomPos();
    if (Math.random() > 0.5) { bomb = getRandomPos(); } else { bomb = null; }
}

function getRandomPos() {
    let pos; let inv = true;
    while (inv) {
        pos = { x: Math.floor(Math.random()*20)*box, y: Math.floor(Math.random()*20)*box };
        inv = snake.some(p => p.x === pos.x && p.y === pos.y) || 
              walls.some(w => w.x === pos.x && w.y === pos.y);
    }
    return pos;
}

function addWall() { walls.push(getRandomPos()); }

function draw() {
    changingDirection = false;
    if(superModeCounter > 0) superModeCounter--;

    // 1. Σχεδίαση Background Effects
    drawBGSnakes();

    // 2. Σκακιέρα (ημιδιαφανής για να φαίνεται το bg)
    for(let r=0; r<20; r++) {
        for(let c=0; c<20; c++) {
            ctx.fillStyle = (r+c)%2==0 ? "rgba(170, 215, 81, 0.9)" : "rgba(162, 209, 73, 0.9)";
            ctx.fillRect(c*box, r*box, box, box);
        }
    }

    // 3. Εμπόδια
    ctx.fillStyle = "#385123";
    walls.forEach(w => { ctx.beginPath(); ctx.roundRect(w.x+2, w.y+2, box-4, box-4, 4); ctx.fill(); });

    // 4. Βόμβα
    if(bomb) {
        ctx.fillStyle = "black";
        ctx.beginPath(); ctx.arc(bomb.x+box/2, bomb.y+box/2, box/2-3, 0, 7); ctx.fill();
        ctx.strokeStyle = "#e67e22"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(bomb.x+box/2, bomb.y+5); ctx.lineTo(bomb.x+box/2+5, bomb.y-2); ctx.stroke();
    }

    // 5. Φρούτο
    ctx.fillStyle = isGoldenApple ? "#f1c40f" : "#e74c3c";
    if(isGoldenApple) { ctx.shadowBlur = 15; ctx.shadowColor = "white"; }
    ctx.beginPath(); ctx.arc(food.x+box/2, food.y+box/2, box/2-2, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;

    // 6. Φίδι (Full Graphics)
    snake.forEach((part, i) => {
        ctx.fillStyle = (superModeCounter > 0) ? (i === 0 ? "#fbc531" : "#f1c40f") : (i === 0 ? "#4672f3" : "#5a82ff");
        ctx.beginPath(); ctx.roundRect(part.x+1, part.y+1, box-2, box-2, 6); ctx.fill();
        if(i === 0) {
            ctx.fillStyle = "white";
            let eX = (d==="R"?3:d==="L"?-3:0), eY = (d==="D"?3:d==="U"?-3:0);
            ctx.beginPath(); ctx.arc(part.x+7+eX, part.y+7+eY, 3.5, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.arc(part.x+13+eX, part.y+7+eY, 3.5, 0, 7); ctx.fill();
            ctx.fillStyle = "black";
            ctx.beginPath(); ctx.arc(part.x+7+eX, part.y+7+eY, 1.5, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.arc(part.x+13+eX, part.y+7+eY, 1.5, 0, 7); ctx.fill();
        }
    });

    // 7. Particles
    particles.forEach((p, index) => {
        p.x += p.vx; p.y += p.vy; p.life--;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
        if(p.life <= 0) particles.splice(index, 1);
    });

    let nX = snake[0].x, nY = snake[0].y;
    if(d=="L") nX-=box; if(d=="U") nY-=box; if(d=="R") nX+=box; if(d=="D") nY+=box;
    let head = {x: nX, y: nY};

    // ΕΛΕΓΧΟΣ ΣΥΓΚΡΟΥΣΗΣ
    if(bomb && nX === bomb.x && nY === bomb.y) {
        playSound('bomb');
        createParticles(bomb.x, bomb.y, "orange");
        createParticles(bomb.x-box, bomb.y, "black"); 
        createParticles(bomb.x+box, bomb.y, "black");
        gameOver(); return;
    }

    if(nX<0 || nX>=400 || nY<0 || nY>=400 || snake.some(p=>p.x===head.x && p.y===head.y) || walls.some(w=>w.x===head.x && w.y===head.y)) {
        playSound('gameover'); gameOver(); return;
    }

    if(nX==food.x && nY==food.y) {
        createParticles(food.x, food.y, isGoldenApple ? "yellow" : "red");
        if(isGoldenApple) { score+=5; playSound('golden'); superModeCounter = 35; } 
        else { score++; playSound('eat'); }
        if(score > 0 && score % 3 === 0) { 
            addWall(); 
            if(currentSpeed > 60) { currentSpeed -= 6; clearInterval(gameLoop); gameLoop = setInterval(draw, currentSpeed); }
        }
        scoreEl.innerText = score; spawnItems();
    } else { snake.pop(); }
    snake.unshift(head);
}

function gameOver() {
    clearInterval(gameLoop);
    if(score > hiScore) { hiScore=score; localStorage.setItem("googleSnakeHi", hiScore); highEl.innerText=hiScore; }
    msgEl.innerText = "GAME OVER"; overlay.style.display = "flex";
}