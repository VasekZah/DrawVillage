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
    ui.jobManagement.innerHTML = '';
    const laborerDiv = document.createElement('div');
    laborerDiv.className = 'flex justify-between items-center mt-2 pt-2 border-t border-gray-600';
    laborerDiv.innerHTML = `<span class="text-gray-300">Dělníci</span><span id="laborerCount" class="text-gray-300">0</span>`;
    Object.keys(CONFIG.JOBS).forEach(jobId => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center';
        div.id = `job-control-${jobId}`;
        div.innerHTML = `<span>${CONFIG.JOBS[jobId].name}</span><div class="flex items-center gap-2 job-control"><button class="btn-action" data-job="${jobId}" data-change="-1">-</button><span id="${jobId}Count" class="w-6 text-center">0</span><button class="btn-action" data-job="${jobId}" data-change="1">+</button></div>`;
        ui.jobManagement.appendChild(div);
    });
    ui.jobManagement.appendChild(laborerDiv);
    
    ui.buildManagement.innerHTML = '';
    Object.keys(CONFIG.BUILDINGS).filter(b => b !== 'stockpile' && b !== 'stone_house').forEach(buildId => {
        const b = CONFIG.BUILDINGS[buildId];
        const costString = Object.entries(b.cost).map(([res, val]) => `${val} ${res==='wood'?'🌲':(res==='stone'?'💎':'')}`).join(', ');
        const button = document.createElement('button');
        button.className = 'btn-action font-bold py-2 px-4 rounded-lg w-full text-left';
        button.dataset.build = buildId;
        button.innerHTML = `${b.name} <span class="text-xs">(${costString})</span>`;
        ui.buildManagement.appendChild(button);
    });
    Object.keys(CONFIG.UPGRADES).forEach(upgradeId => {
        const u = CONFIG.UPGRADES[upgradeId];
        const costString = Object.entries(u.cost).map(([res, val]) => `${val} ${res==='wood'?'🌲':(res==='stone'?'💎':'')}`).join(', ');
        const button = document.createElement('button');
        button.className = 'btn-action font-bold py-2 px-4 rounded-lg w-full text-left mt-2 border-t-2 border-green-700';
        button.dataset.upgrade = upgradeId;
        button.innerHTML = `${u.name} <span class="text-xs">(${costString})</span>`;
        ui.buildManagement.appendChild(button);
    });
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
    const { state } = G;
    const oldTimeOfDay = state.timeOfDay;
    state.timeOfDay = (state.timeOfDay + deltaTime / CONFIG.DAY_LENGTH_MS) % 1;
    if (state.timeOfDay < oldTimeOfDay) { 
        state.day++;
        const totalHousingCapacity = state.buildings.reduce((sum, b) => sum + ((b.type === 'hut' || b.type === 'stone_house') && !b.isUnderConstruction && !b.isUpgrading ? CONFIG.BUILDINGS[b.type].housing : 0), 0);
        if (state.settlers.length < totalHousingCapacity) {
            const fertileHuts = state.buildings.filter(b => (b.type === 'hut' || b.type === 'stone_house') && b.reproductionCooldown <= 0 && b.residents.filter(r => !r.isChild).length >= 2);
            if (fertileHuts.length > 0) {
                const home = fertileHuts[0];
                const newChild = new Settler('Dítě', home.x, home.y, true);
                home.residents.push(newChild);
                newChild.home = home;
                state.settlers.push(newChild);
                home.reproductionCooldown = CONFIG.REPRODUCTION_COOLDOWN_DAYS;
                setNotification('Narodil se nový osadník!');
            }
        }
        if (state.animals.length < CONFIG.MAX_ANIMALS && Math.random() < CONFIG.ANIMAL_REPRODUCTION_CHANCE) {
            const parent = state.animals[Math.floor(Math.random() * state.animals.length)];
            if (parent) {
                const newAnimal = new Animal(parent.type, parent.x + (Math.random()-0.5)*20, parent.y + (Math.random()-0.5)*20);
                state.animals.push(newAnimal);
            }
        }
        for(let y = 0; y < state.grid.length; y++) for(let x = 0; x < state.grid[y].length; x++) {
            const tile = state.grid[y][x];
            if (tile.wear > 0) {
                tile.wear = Math.max(0, tile.wear - CONFIG.PATH_DECAY_RATE);
                state.dirtyGroundTiles.add(`${x},${y}`);
            }
        }
    }
    updateCamera(); 
    assignJobs(); // Zde je volání funkce
    state.settlers.forEach(s => s.update(deltaTime));
    state.worldObjects.forEach(o => o.update());
    state.buildings.forEach(b => b.update?.(deltaTime));
    state.animals.forEach(a => a.update());
    state.projectiles = state.projectiles.filter(p => p.update());
    if (state.notifications.timer > 0) state.notifications.timer -= deltaTime;
    else state.notifications.message = '';
    updateHoveredObject();
}

function assignJobs() {
    const { state } = G;
    const currentJobs = Object.keys(CONFIG.JOBS).reduce((acc, key) => ({...acc, [key]: 0 }), { laborer: 0 });
    state.settlers.forEach(s => { if(!s.isChild) currentJobs[s.job]++; });
    for (const jobType of Object.keys(CONFIG.JOBS)) {
        while (currentJobs[jobType] < state.jobQuotas[jobType] && currentJobs.laborer > 0) {
            const laborer = state.settlers.find(s => s.job === 'laborer' && !s.isChild);
            if (laborer) { laborer.job = jobType; laborer.resetTask(); currentJobs.laborer--; currentJobs[jobType]++; } else break;
        }
        while (currentJobs[jobType] > state.jobQuotas[jobType]) {
            const worker = state.settlers.find(s => s.job === jobType && !s.isChild);
            if (worker) { worker.job = 'laborer'; worker.resetTask(); currentJobs.laborer++; currentJobs[jobType]--; } else break;
        }
    }
}

function updateCamera() {
    const { state } = G;
    const panSpeed = CONFIG.CAMERA_PAN_SPEED / state.camera.zoom;
    if (state.keysPressed['w']) state.camera.y -= panSpeed;
    if (state.keysPressed['s']) state.camera.y += panSpeed;
    if (state.keysPressed['a']) state.camera.x -= panSpeed;
    if (state.keysPressed['d']) state.camera.x += panSpeed;
}

function updateHoveredObject() {
    const { state } = G;
    const worldMouse = screenToWorld(state.mousePos.x, state.mousePos.y);
    state.hoveredObject = null; 
    let minDist = Infinity;
    const allObjects = [...state.settlers, ...state.worldObjects, ...state.buildings, ...state.animals];
    for (const obj of allObjects) {
        const size = obj.radius || (obj.size ? Math.max(obj.size.w, obj.size.h)/2 : 10);
        const dist = Math.hypot(worldMouse.x - obj.x, worldMouse.y - obj.y);
        if (dist < size && dist < minDist) { 
            minDist = dist; 
            state.hoveredObject = obj; 
        }
    }
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
    if (wear < 64) { // Grass
        r = 44 + (60 - 44) * (wear / 64); g = 100 - (100 - 90) * (wear / 64); b = 53 - (53 - 60) * (wear / 64);
    } else if (wear < 192) { // Worn grass
        const p = (wear - 64) / 128;
        r = 60 + (109 - 60) * p; g = 90 - (90 - 93) * p; b = 60 - (60 - 71) * p;
    } else { // Path
        const p = (wear - 192) / 63;
        r = 109 + (93 - 109) * p; g = 93 - (93 - 80) * p; b = 71 - (71 - 65) * p;
    }
    groundCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    groundCtx.fillRect(x * CONFIG.GRID_SIZE, y * CONFIG.GRID_SIZE, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
    
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

    const view = {
        x: state.camera.x, y: state.camera.y,
        w: canvas.width / state.camera.zoom,
        h: canvas.height / state.camera.zoom
    };

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
    ui.wood.textContent = Math.floor(G.state.resources.wood); 
    ui.stone.textContent = Math.floor(G.state.resources.stone);
    ui.food.textContent = Math.floor(G.state.resources.food); 
    ui.day.textContent = G.state.day;
    ui.settlers.textContent = G.state.settlers.length;
    ui.housing.textContent = G.state.buildings.reduce((sum, b) => sum + ((b.type === 'hut' || b.type === 'stone_house') && !b.isUnderConstruction && !b.isUpgrading ? CONFIG.BUILDINGS[b.type].housing : 0), 0);
    
    let adultCount = G.state.settlers.filter(s => !s.isChild).length;
    let assignedJobs = Object.values(G.state.jobQuotas).reduce((a, b) => a + b, 0);
    document.getElementById('laborerCount').textContent = adultCount - assignedJobs;

    Object.keys(CONFIG.JOBS).forEach(jobId => {
        const count = G.state.jobQuotas[jobId];
        const el = document.getElementById(`${jobId}Count`);
        if (el) el.textContent = count;

        const jobInfo = CONFIG.JOBS[jobId];
        const jobControlEl = document.getElementById(`job-control-${jobId}`);
        if (jobInfo.requires) {
            const hasRequiredBuilding = G.state.buildings.some(b => b.type === jobInfo.requires && !b.isUnderConstruction);
            jobControlEl.querySelectorAll('button').forEach(btn => btn.disabled = !hasRequiredBuilding);
            if (!hasRequiredBuilding && G.state.jobQuotas[jobId] > 0) {
                G.state.jobQuotas[jobId] = 0;
            }
        }
    });
    ui.notificationArea.textContent = G.state.notifications.message || '';
}

function addEventListeners() {
    window.addEventListener('resize', resizeCanvas);
    ui.jobManagement.addEventListener('click', e => {
        if (e.target.tagName !== 'BUTTON') return;
        const job = e.target.dataset.job; const change = parseInt(e.target.dataset.change);
        const assignedWorkers = Object.values(G.state.jobQuotas).reduce((a, b) => a + b, 0);
        const adultPopulation = G.state.settlers.filter(s => !s.isChild).length;
        if (change > 0 && assignedWorkers < adultPopulation) G.state.jobQuotas[job]++;
        else if (change < 0 && G.state.jobQuotas[job] > 0) G.state.jobQuotas[job]--;
    });
    ui.buildManagement.addEventListener('click', e => {
        const button = e.target.closest('button'); if (!button) return;
        const buildId = button.dataset.build;
        const upgradeId = button.dataset.upgrade;

        if (buildId) {
            G.state.buildMode = buildId; 
            canvas.classList.add('build-mode');
            setNotification(`Vyber místo pro stavbu: ${CONFIG.BUILDINGS[buildId].name}`);
        } else if (upgradeId) {
            const upgradeInfo = CONFIG.UPGRADES[upgradeId];
            const targetBuilding = G.state.buildings.find(b => b.type === upgradeId && !b.isUpgrading && !b.isUnderConstruction);
            if (targetBuilding) {
                targetBuilding.isUpgrading = true;
                targetBuilding.cost = upgradeInfo.cost;
                targetBuilding.delivered = Object.keys(upgradeInfo.cost).reduce((acc, key) => ({...acc, [key]: 0 }), {});
                targetBuilding.enRoute = Object.keys(upgradeInfo.cost).reduce((acc, key) => ({...acc, [key]: 0 }), {});
                setNotification(`Zahájeno vylepšování: ${CONFIG.BUILDINGS[targetBuilding.type].name}`);
            } else {
                setNotification(`Žádná ${CONFIG.BUILDINGS[upgradeId].name} k vylepšení.`);
            }
        }
    });
    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        G.state.mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    });
    canvas.addEventListener('click', e => {
        if (!G.state.buildMode) return;
        const worldMouse = screenToWorld(G.state.mousePos.x, G.state.mousePos.y);
        const blueprint = CONFIG.BUILDINGS[G.state.buildMode];
        let canPlace = true;
        const start = worldToGrid(worldMouse.x - blueprint.size.w/2, worldMouse.y - blueprint.size.h/2);
        const end = worldToGrid(worldMouse.x + blueprint.size.w/2, worldMouse.y + blueprint.size.h/2);
        for(let y = start.y; y <= end.y; y++) {
            for(let x = start.x; x <= end.x; x++) {
                if(!G.state.grid[y]?.[x] || !G.state.grid[y][x].walkable) {
                    canPlace = false; break;
                }
            }
            if(!canPlace) break;
        }
        if (!canPlace) { setNotification('Zde nelze stavět!'); return; }
        
        const newBuilding = new Building(G.state.buildMode, worldMouse.x, worldMouse.y);
        G.state.buildings.push(newBuilding); 
        updateGridForObject(newBuilding, false);
        G.state.buildMode = null; 
        canvas.classList.remove('build-mode'); 
        setNotification('');
    });
    canvas.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (G.state.buildMode) {
            G.state.buildMode = null; 
            canvas.classList.remove('build-mode'); 
            setNotification('');
            return;
        }
        if (G.state.hoveredObject && (G.state.hoveredObject.isUnderConstruction || G.state.hoveredObject.isUpgrading)) {
            const building = G.state.hoveredObject;
            
            Object.entries(building.delivered).forEach(([res, amount]) => {
                if (amount > 0) {
                    G.state.resources[res] += Math.floor(amount);
                }
            });

            Object.entries(building.enRoute).forEach(([res, amount]) => {
                if (amount > 0) G.state.resources[res] += Math.floor(amount);
            });

            G.state.settlers.forEach(s => {
                if (s.target === building || s.secondaryTarget === building) {
                    s.resetTask();
                }
            });

            updateGridForObject(building, true);
            G.state.buildings = G.state.buildings.filter(b => b !== building);
            setNotification(`Stavba zrušena.`);
        }
    });
    window.addEventListener('keydown', e => { G.state.keysPressed[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', e => { G.state.keysPressed[e.key.toLowerCase()] = false; if(e.key === 'Escape') { G.state.buildMode = null; canvas.classList.remove('build-mode'); setNotification(''); }});
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const worldPosBeforeZoom = screenToWorld(e.offsetX, e.offsetY);
        const zoomAmount = e.deltaY * -0.001;
        G.state.camera.zoom = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, G.state.camera.zoom + zoomAmount));
        const worldPosAfterZoom = screenToWorld(e.offsetX, e.offsetY);
        G.state.camera.x += worldPosBeforeZoom.x - worldPosAfterZoom.x;
        G.state.camera.y += worldPosAfterZoom.y - worldPosBeforeZoom.y;
    });
}

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth; canvas.height = container.offsetHeight;
    groundCanvas.width = CONFIG.WORLD_WIDTH; groundCanvas.height = CONFIG.WORLD_HEIGHT;
    drawFullGround();
}
