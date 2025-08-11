// js/main.js

import { G } from './globals.js';
import { CONFIG } from './config.js';
import { Settler, Building, WorldObject, Child } from './classes.js';
import { OutlineDrawer } from './drawing.js';
import { manageTasks } from './taskManager.js';
import { screenToWorld, addEntity, removeEntity, setNotification, addBuilding, findClosestEntity, createResourcePile } from './helpers.js';
import { initDrawingModal } from './drawingModal.js';
import { getAssetImg } from './uiHelpers.js'; // <-- Importujeme novou funkci

// --- INICIALIZACE ---
document.addEventListener('DOMContentLoaded', () => {
    // Nejprve přiřadíme všechny DOM elementy do G objektu
    Object.assign(G, {
        gameCanvas: document.getElementById('gameCanvas'),
        tooltipElement: document.getElementById('tooltip'),
        ui: {
            resourceDisplay: document.getElementById('resource-display'),
            populationDisplay: document.getElementById('population-display'),
            dayDisplay: document.getElementById('day-display'),
            timeDisplay: document.getElementById('time-display'),
            idleDisplay: document.getElementById('idle-display'),
            jobManagement: document.getElementById('job-management'),
            buildManagement: document.getElementById('build-management'),
            notificationArea: document.getElementById('notificationArea'),
            dayNightOverlay: document.getElementById('dayNightOverlay'),
            timeControls: document.getElementById('time-controls'),
        },
        // Herní stav inicializujeme zde
        state: {
            userAssets: {}, // Data URL z kreslení
            loadedUserAssets: {}, // Načtené obrázky (Image objekty)
            resources: { wood: 50, stone: 20, food: 40 },
            entities: [], settlers: [], buildings: [], worldObjects: [], tasks: [], grid: [],
            camera: { x: CONFIG.WORLD_SIZE / 2, y: CONFIG.WORLD_SIZE / 2, zoom: 1.2 },
            mouse: { x: 0, y: 0, worldX: 0, worldY: 0 },
            keysPressed: {}, buildMode: null, hoveredObject: null, selectedObject: null,
            day: 1, timeOfDay: 0, nextId: 0,
            jobQuotas: Object.keys(CONFIG.JOBS).reduce((acc, key) => ({ ...acc, [key]: 0 }), {}),
            grassPattern: null,
            isPaused: false,
            timeScale: 1,
            reproductionCooldown: 0,
        }
    });
    G.ctx = G.gameCanvas.getContext('2d', { alpha: false });

    // Až teď, když je G plně připraveno, spustíme kreslící okno
    initDrawingModal(init);
});


function init() {
    resizeCanvas();
    setupUI();
    const gridW = CONFIG.WORLD_SIZE / CONFIG.GRID_SIZE, gridH = CONFIG.WORLD_SIZE / CONFIG.GRID_SIZE;
    for (let y = 0; y < gridH; y++) {
        G.state.grid[y] = [];
        for (let x = 0; x < gridW; x++) G.state.grid[y][x] = { x, y, walkable: true, wear: 0 };
    }
    addEntity(new Settler(G.state.camera.x, G.state.camera.y));
    addEntity(new Settler(G.state.camera.x + 20, G.state.camera.y));
    addEntity(new Settler(G.state.camera.x - 20, G.state.camera.y));
    const stockpile = new Building('stockpile', G.state.camera.x, G.state.camera.y + 80);
    stockpile.status = 'operational';
    stockpile.buildProgress = 100;
    addBuilding(stockpile);

    for (let i = 0; i < 150; i++) addEntity(new WorldObject('tree', Math.random() * CONFIG.WORLD_SIZE, Math.random() * CONFIG.WORLD_SIZE, 5));
    for (let i = 0; i < 80; i++) addEntity(new WorldObject('stone', Math.random() * CONFIG.WORLD_SIZE, Math.random() * CONFIG.WORLD_SIZE, 10));
    for (let i = 0; i < 40; i++) addEntity(new WorldObject('berryBush', Math.random() * CONFIG.WORLD_SIZE, Math.random() * CONFIG.WORLD_SIZE, 9));

    OutlineDrawer.createGrassPattern(G.ctx);
    addEventListeners();
    setInterval(manageTasks, 1000);
    gameLoop();
}

// --- MAIN LOOP & DRAWING ---
let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) || 0;
    lastTime = timestamp;

    if (!G.state.isPaused) {
        update(deltaTime * G.state.timeScale);
    }
    draw();
    requestAnimationFrame(gameLoop);
}
function update(deltaTime) {
    if(deltaTime === 0) return;
    G.state.timeOfDay = (G.state.timeOfDay + deltaTime / CONFIG.DAY_LENGTH_MS) % 1;
    const currentDay = Math.floor(1 + G.state.timeOfDay + (G.state.day - 1));
    if (currentDay > G.state.day) {
        G.state.day = currentDay;
        handleDailyEvents();
    }

    for (const row of G.state.grid) for (const cell of row) if (cell.wear > 0) cell.wear = Math.max(0, cell.wear - CONFIG.PATH_DECAY_RATE * deltaTime);
    updateCamera(deltaTime);
    G.state.entities.forEach(e => e.update(deltaTime));

    const homeless = G.state.settlers.filter(s => !s.homeId || !G.state.buildings.some(b => b.id === s.homeId));
    const availableHuts = G.state.buildings.filter(b => b.type === 'hut' && b.status === 'operational' && b.residents.length < CONFIG.BUILDING_INFO.hut.housing);
    for (const settler of homeless) {
        const home = availableHuts.find(h => h.residents.length < CONFIG.BUILDING_INFO.hut.housing);
        if (home) { settler.homeId = home.id; home.residents.push(settler.id); }
        else break;
    }

    const assignedJobs = {};
    for(const job of Object.keys(CONFIG.JOBS)) assignedJobs[job] = 0;
    G.state.settlers.filter(s => s.type === 'settler').forEach(s => { if(s.job !== 'unemployed') assignedJobs[s.job]++; });

    for (const jobId in G.state.jobQuotas) {
        const diff = G.state.jobQuotas[jobId] - assignedJobs[jobId];
        if (diff > 0) {
            const settler = G.state.settlers.find(s => s.type === 'settler' && s.job === 'unemployed' && !s.task);
            if (settler) { settler.job = jobId; assignedJobs[jobId]++; }
        } else if (diff < 0) {
            const settler = G.state.settlers.find(s => s.type === 'settler' && s.job === jobId && !s.task);
            if (settler) { settler.job = 'unemployed'; assignedJobs[jobId]--; }
        }
    }
}

function handleDailyEvents() {
    if (G.state.reproductionCooldown > 0) {
        G.state.reproductionCooldown--;
        return;
    }

    const adultPopulation = G.state.settlers.filter(s => s.type === 'settler');
    const totalPopulation = G.state.settlers.length;
    const housingCapacity = G.state.buildings.filter(b => b.type === 'hut' && b.status === 'operational').reduce((sum, b) => sum + (CONFIG.BUILDING_INFO.hut.housing || 0), 0);

    if (totalPopulation < housingCapacity && adultPopulation.length >= 2) {
        if (Math.random() < CONFIG.REPRODUCTION_CHANCE_PER_DAY) {
            const home = G.state.buildings.find(b => b.type === 'hut' && b.status === 'operational' && b.residents.length < CONFIG.BUILDING_INFO.hut.housing);
            if (home) {
                setNotification('A child was born!', 4000);
                const child = new Child(home.x, home.y);
                child.homeId = home.id;
                home.residents.push(child.id);
                addEntity(child);
                G.state.reproductionCooldown = CONFIG.REPRODUCTION_COOLDOWN_DAYS;
            }
        }
    }
}

function updateCamera(deltaTime) {
    const panSpeed = (CONFIG.CAMERA_PAN_SPEED / G.state.camera.zoom) * (deltaTime / 16);
    if (G.state.keysPressed['w']) G.state.camera.y -= panSpeed; if (G.state.keysPressed['s']) G.state.camera.y += panSpeed;
    if (G.state.keysPressed['a']) G.state.camera.x -= panSpeed; if (G.state.keysPressed['d']) G.state.camera.x += panSpeed;
    G.state.camera.x = Math.max(0, Math.min(CONFIG.WORLD_SIZE, G.state.camera.x));
    G.state.camera.y = Math.max(0, Math.min(CONFIG.WORLD_SIZE, G.state.camera.y));
}
function draw() {
    G.ctx.fillStyle = '#f7fafc';
    G.ctx.fillRect(0, 0, G.gameCanvas.width, G.gameCanvas.height);

    G.ctx.save();
    G.ctx.translate(G.gameCanvas.width / 2, G.gameCanvas.height / 2);
    G.ctx.scale(G.state.camera.zoom, G.state.camera.zoom);
    G.ctx.translate(-G.state.camera.x, -G.state.camera.y);

    const viewBounds = {
        x1: G.state.camera.x - (G.gameCanvas.width / 2) / G.state.camera.zoom,
        y1: G.state.camera.y - (G.gameCanvas.height / 2) / G.state.camera.zoom,
        x2: G.state.camera.x + (G.gameCanvas.width / 2) / G.state.camera.zoom,
        y2: G.state.camera.y + (G.gameCanvas.height / 2) / G.state.camera.zoom,
    };

    if (G.state.grassPattern) {
        G.ctx.fillStyle = G.state.grassPattern;
        G.ctx.fillRect(viewBounds.x1, viewBounds.y1, viewBounds.x2 - viewBounds.x1, viewBounds.y2 - viewBounds.y1);
    }

    const startY = Math.max(0, Math.floor(viewBounds.y1 / CONFIG.GRID_SIZE));
    const endY = Math.min(G.state.grid.length, Math.ceil(viewBounds.y2 / CONFIG.GRID_SIZE));
    const startX = Math.max(0, Math.floor(viewBounds.x1 / CONFIG.GRID_SIZE));
    const endX = Math.min(G.state.grid[0]?.length || 0, Math.ceil(viewBounds.x2 / CONFIG.GRID_SIZE));

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const cell = G.state.grid[y][x];
            if (cell.wear > 0.01) {
                G.ctx.fillStyle = `rgba(203, 213, 224, ${cell.wear * 0.9})`;
                G.ctx.fillRect(cell.x * CONFIG.GRID_SIZE, cell.y * CONFIG.GRID_SIZE, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
            }
        }
    }

    const visibleEntities = G.state.entities.filter(e =>
        e.x + e.radius > viewBounds.x1 && e.x - e.radius < viewBounds.x2 &&
        e.y + e.radius > viewBounds.y1 && e.y - e.radius < viewBounds.y2
    );
    visibleEntities.sort((a, b) => a.y - b.y).forEach(e => e.draw());

    const highlighted = G.state.selectedObject || G.state.hoveredObject;
    if (highlighted) {
        G.ctx.strokeStyle = G.state.selectedObject === highlighted ? '#2d3748' : '#718096';
        G.ctx.lineWidth = 2 / G.state.camera.zoom;
        G.ctx.setLineDash([4 / G.state.camera.zoom, 3 / G.state.camera.zoom]);
        const r = highlighted.radius + 4 / G.state.camera.zoom;
        G.ctx.beginPath();
        G.ctx.arc(highlighted.x, highlighted.y, r, 0, Math.PI * 2);
        G.ctx.stroke();
        G.ctx.setLineDash([]);
    }
    if (G.state.buildMode) {
        const info = CONFIG.BUILDING_INFO[G.state.buildMode];
        const x = Math.round(G.state.mouse.worldX / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const y = Math.round(G.state.mouse.worldY / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        G.ctx.save();
        G.ctx.translate(x, y);

        OutlineDrawer.draw(G.ctx, { type: G.state.buildMode, radius: info.size.w/2, size: info.size, x:0, y:0 });

        G.ctx.globalAlpha = 1.0;
        G.ctx.strokeStyle = '#2d3748';
        G.ctx.lineWidth = 2 / G.state.camera.zoom;
        G.ctx.setLineDash([6 / G.state.camera.zoom, 4 / G.state.camera.zoom]);
        G.ctx.strokeRect(-info.size.w / 2, -info.size.h / 2, info.size.w, info.size.h);
        G.ctx.setLineDash([]);

        G.ctx.restore();
    }
    G.ctx.restore();
    updateUI();
}
function updateUI() {
    document.getElementById('woodCount').textContent = Math.floor(G.state.resources.wood);
    document.getElementById('stoneCount').textContent = Math.floor(G.state.resources.stone);
    document.getElementById('foodCount').textContent = Math.floor(G.state.resources.food);

    const totalPopulation = G.state.settlers.length;
    const housingCapacity = G.state.buildings.filter(b => b.type === 'hut' && b.status === 'operational').reduce((sum, b) => sum + (CONFIG.BUILDING_INFO.hut.housing || 0), 0);
    G.ui.populationDisplay.innerHTML = `${getAssetImg('icon_settler')} <span class="font-semibold">${totalPopulation} / ${housingCapacity}</span>`;
    G.ui.dayDisplay.innerHTML = `${getAssetImg('icon_day')} <span class="font-semibold">${G.state.day}</span>`;
    const timeNames = ["Night", "Morning", "Noon", "Evening"];
    G.ui.timeDisplay.innerHTML = `${getAssetImg('icon_time')} <span class="font-semibold">${timeNames[Math.floor(G.state.timeOfDay * 4)]}</span>`;

    let assignedCount = 0;
    const adultPopulation = G.state.settlers.filter(s => s.type === 'settler').length;
    Object.entries(G.state.jobQuotas).forEach(([jobId, count]) => {
        const el = document.getElementById(`${jobId}Count`);
        if (el) el.textContent = count;
        assignedCount += count;
    });
    G.ui.idleDisplay.innerHTML = `${getAssetImg('icon_idle')} <span class="font-bold">${Math.max(0, adultPopulation - assignedCount)}</span>`;

    const time = G.state.timeOfDay;
    let overlayColor;
    const nightOpacity = 0.5;
    const eveningOpacity = 0.25;

    if (time < 0.25) {
        const progress = time / 0.25;
        overlayColor = `rgba(45, 55, 72, ${(1 - progress) * nightOpacity})`;
    } else if (time >= 0.25 && time < 0.5) {
         overlayColor = `rgba(237, 137, 54, 0)`;
    } else if (time >= 0.5 && time < 0.75) {
        const progress = (time - 0.5) / 0.25;
        overlayColor = `rgba(237, 137, 54, ${progress * eveningOpacity})`;
    } else {
        const progress = (time - 0.75) / 0.25;
        const [eR, eG, eB] = [237, 137, 54];
        const [nR, nG, nB] = [45, 55, 72];
        const r = eR + (nR - eR) * progress;
        const g = eG + (nG - eG) * progress;
        const b = eB + (nB - eB) * progress;
        const opacity = eveningOpacity + (nightOpacity - eveningOpacity) * progress;
        overlayColor = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${opacity})`;
    }
    G.ui.dayNightOverlay.style.backgroundColor = overlayColor;

    const hasFarm = G.state.buildings.some(b => b.type === 'farm' && b.status === 'operational');
    const hasLodge = G.state.buildings.some(b => b.type === 'foresterLodge' && b.status === 'operational');
    document.querySelectorAll('[data-job-controls="farmer"]').forEach(el => el.style.display = hasFarm ? 'flex' : 'none');
    document.querySelectorAll('[data-job-controls="forester"]').forEach(el => el.style.display = hasLodge ? 'flex' : 'none');
    if(!hasFarm && G.state.jobQuotas.farmer > 0) G.state.jobQuotas.farmer = 0;
    if(!hasLodge && G.state.jobQuotas.forester > 0) G.state.jobQuotas.forester = 0;

    document.getElementById('pauseBtn').classList.toggle('active', G.state.isPaused);
    document.getElementById('playBtn').classList.toggle('active', !G.state.isPaused && G.state.timeScale === 1);
    document.getElementById('ff2Btn').classList.toggle('active', !G.state.isPaused && G.state.timeScale === 2);
    document.getElementById('ff4Btn').classList.toggle('active', !G.state.isPaused && G.state.timeScale === 4);
}
function updateHoveredObject(e) {
    const rect = G.gameCanvas.getBoundingClientRect();
    const isOverCanvas = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

    G.tooltipElement.style.left = `${e.clientX + 15}px`;
    G.tooltipElement.style.top = `${e.clientY + 15}px`;

    let activeTooltip = false;

    if (isOverCanvas) {
        G.state.hoveredObject = findClosestEntity({x: G.state.mouse.worldX, y: G.state.mouse.worldY}, en => Math.hypot(G.state.mouse.worldX - en.x, G.state.mouse.worldY - en.y) < en.radius * 1.2, 32);
        if(G.state.hoveredObject) {
            G.tooltipElement.innerHTML = G.state.hoveredObject.getTooltip();
            activeTooltip = true;
        }
    }

    const uiElement = e.target.closest('[data-tooltip]');
    if (uiElement) {
        G.tooltipElement.innerHTML = uiElement.dataset.tooltip;
        activeTooltip = true;
    }

    G.tooltipElement.style.display = activeTooltip ? 'block' : 'none';
}

function addEventListeners() {
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', e => { G.state.keysPressed[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', e => { G.state.keysPressed[e.key.toLowerCase()] = false; if (e.key === 'Escape') { G.state.buildMode = null; G.gameCanvas.classList.remove('build-mode'); G.state.selectedObject = null; } });

    window.addEventListener('mousemove', e => {
        const rect = G.gameCanvas.getBoundingClientRect();
        G.state.mouse.x = e.clientX - rect.left;
        G.state.mouse.y = e.clientY - rect.top;
        const worldPos = screenToWorld(G.state.mouse.x, G.state.mouse.y);
        G.state.mouse.worldX = worldPos.x;
        G.state.mouse.worldY = worldPos.y;
        updateHoveredObject(e);
    });

    G.gameCanvas.addEventListener('mousedown', e => {
        if (e.button === 0) {
            if (G.state.buildMode) {
                const x = Math.round(G.state.mouse.worldX / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
                const y = Math.round(G.state.mouse.worldY / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
                addBuilding(new Building(G.state.buildMode, x, y));
                if (!G.state.keysPressed['shift']) { G.state.buildMode = null; G.gameCanvas.classList.remove('build-mode'); }
            } else { G.state.selectedObject = G.state.hoveredObject; }
        } else if (e.button === 2) {
            if (G.state.buildMode) {
                G.state.buildMode = null; G.gameCanvas.classList.remove('build-mode');
            } else if (G.state.hoveredObject && G.state.hoveredObject.status === 'blueprint') {
                const building = G.state.hoveredObject;
                Object.entries(building.delivered).forEach(([resource, amount]) => {
                    if (amount > 0) createResourcePile(resource, building.x, building.y, amount);
                });
                removeEntity(building);
                setNotification('Construction cancelled.');
            } else {
                G.state.selectedObject = null;
            }
        }
    });
    G.gameCanvas.addEventListener('wheel', e => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        const newZoom = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, G.state.camera.zoom * zoomFactor));
        const worldPos = screenToWorld(G.state.mouse.x, G.state.mouse.y);
        G.state.camera.zoom = newZoom;
        G.state.camera.x = worldPos.x - (G.state.mouse.x - G.gameCanvas.width / 2) / G.state.camera.zoom;
        G.state.camera.y = worldPos.y - (G.state.mouse.y - G.gameCanvas.height / 2) / G.state.camera.zoom;
    }, { passive: false });
    G.gameCanvas.addEventListener('contextmenu', e => e.preventDefault());

    G.ui.jobManagement.addEventListener('click', e => {
        const button = e.target.closest('button');
        if (!button || button.disabled) return;
        const job = button.dataset.job; const change = parseInt(button.dataset.change);
        const adultPopulation = G.state.settlers.filter(s => s.type === 'settler').length;
        const totalAssigned = Object.values(G.state.jobQuotas).reduce((a, b) => a + b, 0);
        if (change > 0 && totalAssigned < adultPopulation) G.state.jobQuotas[job]++;
        else if (change < 0 && G.state.jobQuotas[job] > 0) G.state.jobQuotas[job]--;
    });
}
function setupUI() {
    G.ui.resourceDisplay.innerHTML = Object.keys(CONFIG.RESOURCES_INFO).map(id => `
        <div data-tooltip="${CONFIG.RESOURCES_INFO[id].name}" class="flex items-center gap-2">
            ${getAssetImg(id, 'w-6 h-6 inline-block')}
            <span id="${id}Count" class="font-semibold">0</span>
        </div>
    `).join('');

    G.ui.buildManagement.innerHTML = '';
    Object.entries(CONFIG.BUILDING_INFO).forEach(([id, info]) => {
        const button = document.createElement('button');
        button.className = 'btn p-2 rounded-lg w-full h-16 flex items-center justify-center relative text-center';
        
        const costString = Object.entries(CONFIG.BUILDING_COSTS[id]).map(([res, val]) => `${getAssetImg(res, 'inline-block w-4 h-4')} ${val}`).join(' ');
        const tooltipContent = `<b>${info.name}</b><br>${info.description}<br>Cost: ${costString}`;
        
        button.innerHTML = `<span>${info.name}</span><div class="build-btn-canvas absolute bottom-1 right-1">${getAssetImg(id, 'w-8 h-8')}</div>`;
        button.dataset.tooltip = tooltipContent;

        button.addEventListener('click', () => {
             G.state.buildMode = id;
             G.gameCanvas.classList.add('build-mode');
        });

        G.ui.buildManagement.appendChild(button);
    });

    G.ui.jobManagement.innerHTML = '';
    Object.keys(CONFIG.JOBS).forEach(id => {
        const info = CONFIG.JOBS[id];
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center';
        div.dataset.jobControls = id;
        if (id === 'farmer' || id === 'forester') {
            div.style.display = 'none';
        }

        const iconSpan = document.createElement('span');
        iconSpan.className = 'flex items-center gap-2 text-lg';
        iconSpan.innerHTML = `${getAssetImg('icon_' + id)} <span>${info.name}</span>`;
        iconSpan.dataset.tooltip = `<b>${info.name}</b><br>${info.description}`;

        const controls = document.createElement('div');
        controls.className = 'flex items-center gap-2 job-control';
        controls.innerHTML = `<button class="rounded" data-job="${id}" data-change="-1">-</button>
                              <span id="${id}Count" class="w-6 text-center font-bold text-lg">0</span>
                              <button class="rounded" data-job="${id}" data-change="1">+</button>`;

        div.appendChild(iconSpan);
        div.appendChild(controls);
        G.ui.jobManagement.appendChild(div);
    });

    G.ui.timeControls.innerHTML = `
        <button id="pauseBtn" class="time-control rounded" data-tooltip="Pause (Space)">${getAssetImg('icon_pause', 'w-full h-full p-1')}</button>
        <button id="playBtn" class="time-control rounded active" data-tooltip="Normal Speed (1)">${getAssetImg('icon_play', 'w-full h-full p-1')}</button>
        <button id="ff2Btn" class="time-control rounded" data-tooltip="2x Speed (2)">${getAssetImg('icon_ff2', 'w-full h-full p-1')}</button>
        <button id="ff4Btn" class="time-control rounded" data-tooltip="4x Speed (3)">${getAssetImg('icon_ff4', 'w-full h-full p-1')}</button>
    `;
    document.getElementById('pauseBtn').addEventListener('click', () => { G.state.isPaused = true; });
    document.getElementById('playBtn').addEventListener('click', () => { G.state.isPaused = false; G.state.timeScale = 1; });
    document.getElementById('ff2Btn').addEventListener('click', () => { G.state.isPaused = false; G.state.timeScale = 2; });
    document.getElementById('ff4Btn').addEventListener('click', () => { G.state.isPaused = false; G.state.timeScale = 4; });
}
const resizeCanvas = () => {
    const container = G.gameCanvas.parentElement;
    G.gameCanvas.width = container.offsetWidth;
    G.gameCanvas.height = container.offsetHeight;
};
