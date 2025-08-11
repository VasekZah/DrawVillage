import { G } from './globals.js';
import { CONFIG } from './config.js';
import { PixelDrawer } from './drawing.js';
import { Settler, Building, WorldObject, Animal, Projectile } from './classes.js';
import { findPath } from './pathfinding.js';
import { findClosest, worldToGrid, screenToWorld, setNotification, updateGridForObject, findWalkableNeighbor, assignHomes } from './helpers.js';

let canvas, ctx, groundCanvas, groundCtx, ui;

document.addEventListener('DOMContentLoaded', () => {
    G.canvas = document.getElementById('gameCanvas');
    G.ctx = G.canvas.getContext('2d');
    canvas = G.canvas;
    ctx = G.ctx;
    
    ui = G.ui = {
        wood: document.getElementById('woodCount'), stone: document.getElementById('stoneCount'),
        food: document.getElementById('foodCount'), settlers: document.getElementById('settlerCount'),
        housing: document.getElementById('housingCapacity'), day: document.getElementById('dayCount'),
        jobManagement: document.querySelector('#job-management .space-y-2'),
        buildManagement: document.querySelector('#build-management .space-y-2'),
        notificationArea: document.getElementById('notificationArea'),
        tooltip: document.getElementById('tooltip'),
    };
    
    groundCanvas = G.groundCanvas = document.createElement('canvas');
    groundCtx = G.groundCtx = groundCanvas.getContext('2d');

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

    G.state.camera.x = CONFIG.WORLD_WIDTH / 2 - canvas.width / (2 * G.state.camera.zoom);
    G.state.camera.y = CONFIG.WORLD_HEIGHT / 2 - canvas.height / (2 * G.state.camera.zoom);
    
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

function populateUI() {
    // ...
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
    // ...
}

function assignJobs() {
    // ...
}

function updateCamera() {
    // ...
}

function updateHoveredObject() {
    // ...
}

function drawFullGround() {
    for (let y = 0; y < G.state.grid.length; y++) {
        for (let x = 0; x < G.state.grid[y].length; x++) {
            drawGroundTile(x, y);
        }
    }
}

function drawGroundTile(x, y) {
    const tile = G.state.grid[y][x];
    const wear = tile.wear;
    let r, g, b;
    if (wear < 64) { 
        r = 44 + (60 - 44) * (wear / 64); g = 100 - (100 - 90) * (wear / 64); b = 53 - (53 - 60) * (wear / 64);
    } else if (wear < 192) {
        const p = (wear - 64) / 128;
        r = 60 + (109 - 60) * p; g = 90 - (90 - 93) * p; b = 60 - (60 - 71) * p;
    } else {
        const p = (wear - 192) / 63;
        r = 109 + (93 - 109) * p; g = 93 - (93 - 80) * p; b = 71 - (71 - 65) * p;
    }
    groundCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    // ZMENŠENÍ CEST
    const padding = CONFIG.GRID_SIZE / 3;
    groundCtx.fillRect(x * CONFIG.GRID_SIZE + padding, y * CONFIG.GRID_SIZE + padding, CONFIG.GRID_SIZE - padding * 2, CONFIG.GRID_SIZE - padding * 2);
    
    if (tile.detail === 'flower') {
        groundCtx.fillStyle = '#fdd835';
        groundCtx.fillRect(x * CONFIG.GRID_SIZE + 4, y * CONFIG.GRID_SIZE + 4, 2, 2);
    } else if (tile.detail === 'pebble') {
        groundCtx.fillStyle = '#9e9e9e';
        groundCtx.fillRect(x * CONFIG.GRID_SIZE + 3, y * CONFIG.GRID_SIZE + 5, 3, 2);
    }
}

function draw() {
    const { state } = G;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    
    state.dirtyGroundTiles.forEach(key => {
        const [x, y] = key.split(',').map(Number);
        drawGroundTile(x, y);
    });
    state.dirtyGroundTiles.clear();
    
    ctx.translate(-state.camera.x * state.camera.zoom, -state.camera.y * state.camera.zoom);
    ctx.scale(state.camera.zoom, state.camera.zoom);

    const view = { x: state.camera.x, y: state.camera.y, w: canvas.width / state.camera.zoom, h: canvas.height / state.camera.zoom };
    ctx.drawImage(groundCanvas, view.x, view.y, view.w, view.h, view.x, view.y, view.w, view.h);

    const visibleObjects = [...state.worldObjects, ...state.buildings, ...state.animals, ...state.settlers, ...state.projectiles].filter(o => {
        const size = o.size ? Math.max(o.size.w, o.size.h) : o.radius * 2;
        return o.x + size > view.x && o.x - size < view.x + view.w && o.y + size > view.y && o.y - size < view.y + view.h;
    });

    visibleObjects.sort((a, b) => a.y - b.y);
    visibleObjects.forEach(o => o.draw());

    if (state.hoveredObject) {
        ctx.strokeStyle = 'white'; ctx.lineWidth = 1 / state.camera.zoom; ctx.beginPath();
        const size = state.hoveredObject.radius || (state.hoveredObject.size ? Math.max(state.hoveredObject.size.w, state.hoveredObject.size.h)/2 + 2 : 10);
        ctx.rect(state.hoveredObject.x - size, state.hoveredObject.y - size, size * 2, size * 2);
        ctx.stroke();
    }
    if (state.buildMode) {
        const worldMouse = screenToWorld(state.mousePos.x, state.mousePos.y);
        const blueprint = CONFIG.BUILDINGS[state.buildMode];
        ctx.globalAlpha = 0.6;
        let canPlace = true;
        const start = worldToGrid(worldMouse.x - blueprint.size.w/2, worldMouse.y - blueprint.size.h/2);
        const end = worldToGrid(worldMouse.x + blueprint.size.w/2, worldMouse.y + blueprint.size.h/2);
        for(let y = start.y; y <= end.y; y++) {
            for(let x = start.x; x <= end.x; x++) {
                if(!state.grid[y]?.[x] || !state.grid[y][x].walkable) {
                    canPlace = false; break;
                }
            }
            if(!canPlace) break;
        }
        ctx.fillStyle = canPlace ? 'green' : 'red';
        ctx.fillRect(worldMouse.x - blueprint.size.w/2, worldMouse.y - blueprint.size.h/2, blueprint.size.w, blueprint.size.h);
        ctx.globalAlpha = 1.0;
    }
    
    ctx.restore();
    
    const tooltip = G.ui.tooltip;
    if (state.hoveredObject && state.hoveredObject.getTooltip) {
        tooltip.innerHTML = state.hoveredObject.getTooltip();
        tooltip.style.display = 'block';
        tooltip.style.left = `${state.mousePos.x + 15}px`;
        tooltip.style.top = `${state.mousePos.y + 15}px`;
    } else {
        tooltip.style.display = 'none';
    }
    updateUIDisplay();
}

function updateUIDisplay() {
    // ...
}

function addEventListeners() {
    // ...
}

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth; canvas.height = container.offsetHeight;
    groundCanvas.width = CONFIG.WORLD_WIDTH; groundCanvas.height = CONFIG.WORLD_HEIGHT;
    drawFullGround();
}
