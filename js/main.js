import { G } from './globals.js';
import { CONFIG } from './config.js';
import { PixelDrawer } from './drawing.js';
import { Settler, Building, WorldObject, Animal, Projectile } from './classes.js';
import { findPath } from './pathfinding.js';
import { findClosest, worldToGrid, screenToWorld, setNotification, updateGridForObject, findWalkableNeighbor } from './helpers.js';

// --- MAIN INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Assign global references
    G.canvas = document.getElementById('gameCanvas');
    G.ctx = G.canvas.getContext('2d');
    G.ui = {
        wood: document.getElementById('woodCount'), stone: document.getElementById('stoneCount'),
        food: document.getElementById('foodCount'), settlers: document.getElementById('settlerCount'),
        housing: document.getElementById('housingCapacity'), day: document.getElementById('dayCount'),
        jobManagement: document.querySelector('#job-management .space-y-2'),
        buildManagement: document.querySelector('#build-management .space-y-2'),
        notificationArea: document.getElementById('notificationArea'),
    };
    G.groundCanvas = document.createElement('canvas');
    G.groundCtx = G.groundCanvas.getContext('2d');

    // Initialize game state
    G.state = {
        resources: { wood: 50, food: 40, stone: 10 },
        settlers: [], worldObjects: [], buildings: [], animals: [], grid: [], projectiles: [],
        jobQuotas: Object.keys(CONFIG.JOBS).reduce((acc, key) => ({...acc, [key]: 0 }), { laborer: 0 }),
        buildMode: null, mousePos: { x: 0, y: 0 },
        camera: { x: 0, y: 0, zoom: 1.5 },
        keysPressed: {}, hoveredObject: null,
        day: 1, timeOfDay: 0, notifications: {},
        dirtyGroundTiles: new Set(),
    };

    init();
});

function init() {
    populateUI();
    
    const gridW = CONFIG.WORLD_WIDTH / CONFIG.GRID_SIZE; 
    const gridH = CONFIG.WORLD_HEIGHT / CONFIG.GRID_SIZE;
    G.state.grid = [];
    for (let y = 0; y < gridH; y++) {
        G.state.grid[y] = [];
        for (let x = 0; x < gridW; x++) G.state.grid[y][x] = { x, y, walkable: true, wear: 0, g: Infinity, f: Infinity, parent: null, detail: Math.random() > 0.95 ? (Math.random() > 0.5 ? 'flower' : 'pebble') : null };
    }

    G.state.camera.x = CONFIG.WORLD_WIDTH / 2 - G.canvas.width / 2;
    G.state.camera.y = CONFIG.WORLD_HEIGHT / 2 - G.canvas.height / 2;
    
    const centerX = CONFIG.WORLD_WIDTH / 2; 
    const centerY = CONFIG.WORLD_HEIGHT / 2;

    G.state.settlers.push(new Settler('Jan', centerX, centerY), new Settler('Eva', centerX + 30, centerY), new Settler('Adam', centerX - 30, centerY));
    G.state.buildings.push(new Building('stockpile', centerX, centerY + 50));
    
    for (let i = 0; i < 200; i++) G.state.worldObjects.push(new WorldObject('tree', Math.random() * CONFIG.WORLD_WIDTH, Math.random() * CONFIG.WORLD_HEIGHT));
    for (let i = 0; i < 120; i++) G.state.worldObjects.push(new WorldObject('stone', Math.random() * CONFIG.WORLD_WIDTH, Math.random() * CONFIG.WORLD_HEIGHT));
    for (let i = 0; i < 150; i++) G.state.worldObjects.push(new WorldObject('bush', Math.random() * CONFIG.WORLD_WIDTH, Math.random() * CONFIG.WORLD_HEIGHT));
    for (let i = 0; i < 8; i++) G.state.animals.push(new Animal('deer', Math.random() * CONFIG.WORLD_WIDTH, Math.random() * CONFIG.WORLD_HEIGHT));
    for (let i = 0; i < 15; i++) G.state.animals.push(new Animal('rabbit', Math.random() * CONFIG.WORLD_WIDTH, Math.random() * CONFIG.WORLD_HEIGHT));
    
    [...G.state.buildings, ...G.state.worldObjects.filter(o => o.type === 'tree' || o.type === 'stone')].forEach(obj => updateGridForObject(obj, false));
    assignHomes();
    
    resizeCanvas(); 
    addEventListeners(); 
    gameLoop();
}

let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime || 0;
    lastTime = timestamp;
    update(deltaTime); 
    draw();
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    // ... all update logic from the provided single-file code
}

function draw() {
    // ... all draw logic from the provided single-file code
}

// ... all other functions (populateUI, event listeners, etc.) from the provided single-file code
