import { state, CONFIG, ui, gameCanvas, ctx, tooltipElement, loadedUserAssets } from './config.js';
import { Settler, Building, WorldObject, Child } from './classes.js';
import { OutlineDrawer } from './drawing.js';
import { manageTasks } from './taskManager.js';
import { screenToWorld, addEntity, removeEntity, setNotification, addBuilding, findClosestEntity, createResourcePile } from './helpers.js';
import { initDrawingModal } from './drawingModal.js';

// Helper to create an image tag from a loaded asset
function getAssetImg(name, classes = 'icon') {
    const asset = loadedUserAssets[name];
    if (asset) {
        return `<img src="${asset.src}" class="${classes}" alt="${name}" />`;
    }
    return `<span class="${classes}">?</span>`; // Fallback
}


// --- INITIALIZATION ---
function init() {
    resizeCanvas();
    setupUI();
    const gridW = CONFIG.WORLD_SIZE / CONFIG.GRID_SIZE, gridH = CONFIG.WORLD_SIZE / CONFIG.GRID_SIZE;
    for (let y = 0; y < gridH; y++) {
        state.grid[y] = [];
        for (let x = 0; x < gridW; x++) state.grid[y][x] = { x, y, walkable: true, wear: 0 };
    }
    addEntity(new Settler(state.camera.x, state.camera.y));
    addEntity(new Settler(state.camera.x + 20, state.camera.y));
    addEntity(new Settler(state.camera.x - 20, state.camera.y));
    const stockpile = new Building('stockpile', state.camera.x, state.camera.y + 80);
    stockpile.status = 'operational';
    stockpile.buildProgress = 100;
    addBuilding(stockpile);

    for (let i = 0; i < 150; i++) addEntity(new WorldObject('tree', Math.random() * CONFIG.WORLD_SIZE, Math.random() * CONFIG.WORLD_SIZE, 5));
    for (let i = 0; i < 80; i++) addEntity(new WorldObject('stone', Math.random() * CONFIG.WORLD_SIZE, Math.random() * CONFIG.WORLD_SIZE, 10));
    for (let i = 0; i < 40; i++) addEntity(new WorldObject('berryBush', Math.random() * CONFIG.WORLD_SIZE, Math.random() * CONFIG.WORLD_SIZE, 9));

    OutlineDrawer.createGrassPattern(ctx);
    addEventListeners();
    setInterval(manageTasks, 1000);
    gameLoop();
}

// --- MAIN LOOP & DRAWING ---
let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) || 0;
    lastTime = timestamp;

    if (!state.isPaused) {
        update(deltaTime * state.timeScale);
    }
    draw();
    requestAnimationFrame(gameLoop);
}
function update(deltaTime) {
    if(deltaTime === 0) return;
    state.timeOfDay = (state.timeOfDay + deltaTime / CONFIG.DAY_LENGTH_MS) % 1;
    const currentDay = Math.floor(1 + state.timeOfDay + (state.day - 1));
    if (currentDay > state.day) {
        state.day = currentDay;
        handleDailyEvents();
    }

    for (const row of state.grid) for (const cell of row) if (cell.wear > 0) cell.wear = Math.max(0, cell.wear - CONFIG.PATH_DECAY_RATE * deltaTime);
    updateCamera(deltaTime);
    state.entities.forEach(e => e.update(deltaTime));

    const homeless = state.settlers.filter(s => !s.homeId || !state.buildings.some(b => b.id === s.homeId));
    const availableHuts = state.buildings.filter(b => b.type === 'hut' && b.status === 'operational' && b.residents.length < CONFIG.BUILDING_INFO.hut.housing);
    for (const settler of homeless) {
        const home = availableHuts.find(h => h.residents.length < CONFIG.BUILDING_INFO.hut.housing);
        if (home) { settler.homeId = home.id; home.residents.push(settler.id); }
        else break;
    }

    const assignedJobs = {};
    for(const job of Object.keys(CONFIG.JOBS)) assignedJobs[job] = 0;
    state.settlers.filter(s => s.type === 'settler').forEach(s => { if(s.job !== 'unemployed') assignedJobs[s.job]++; });

    for (const jobId in state.jobQuotas) {
        const diff = state.jobQuotas[jobId] - assignedJobs[jobId];
        if (diff > 0) {
            const settler = state.settlers.find(s => s.type === 'settler' && s.job === 'unemployed' && !s.task);
            if (settler) { settler.job = jobId; assignedJobs[jobId]++; }
        } else if (diff < 0) {
            const settler = state.settlers.find(s => s.type === 'settler' && s.job === jobId && !s.task);
            if (settler) { settler.job = 'unemployed'; assignedJobs[jobId]--; }
        }
    }
}

function handleDailyEvents() {
    if (state.reproductionCooldown > 0) {
        state.reproductionCooldown--;
        return;
    }

    const adultPopulation = state.settlers.filter(s => s.type === 'settler');
    const totalPopulation = state.settlers.length;
    const housingCapacity = state.buildings.filter(b => b.type === 'hut' && b.status === 'operational').reduce((sum, b) => sum + (CONFIG.BUILDING_INFO.hut.housing || 0), 0);

    if (totalPopulation < housingCapacity && adultPopulation.length >= 2) {
        if (Math.random() < CONFIG.REPRODUCTION_CHANCE_PER_DAY) {
            const home = state.buildings.find(b => b.type === 'hut' && b.status === 'operational' && b.residents.length < CONFIG.BUILDING_INFO.hut.housing);
            if (home) {
                setNotification('A child was born!', 4000);
                const child = new Child(home.x, home.y);
                child.homeId = home.id;
                home.residents.push(child.id);
                addEntity(child);
                state.reproductionCooldown = CONFIG.REPRODUCTION_COOLDOWN_DAYS;
            }
        }
    }
}

function updateCamera(deltaTime) {
    const panSpeed = (CONFIG.CAMERA_PAN_SPEED / state.camera.zoom) * (deltaTime / 16);
    if (state.keysPressed['w']) state.camera.y -= panSpeed; if (state.keysPressed['s']) state.camera.y += panSpeed;
    if (state.keysPressed['a']) state.camera.x -= panSpeed; if (state.keysPressed['d']) state.camera.x += panSpeed;
    state.camera.x = Math.max(0, Math.min(CONFIG.WORLD_SIZE, state.camera.x));
    state.camera.y = Math.max(0, Math.min(CONFIG.WORLD_SIZE, state.camera.y));
}
function draw() {
    ctx.fillStyle = '#f7fafc';
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

    ctx.save();
    ctx.translate(gameCanvas.width / 2, gameCanvas.height / 2);
    ctx.scale(state.camera.zoom, state.camera.zoom);
    ctx.translate(-state.camera.x, -state.camera.y);

    const viewBounds = {
        x1: state.camera.x - (gameCanvas.width / 2) / state.camera.zoom,
        y1: state.camera.y - (gameCanvas.height / 2) / state.camera.zoom,
        x2: state.camera.x + (gameCanvas.width / 2) / state.camera.zoom,
        y2: state.camera.y + (gameCanvas.height / 2) / state.camera.zoom,
    };

    if (state.grassPattern) {
        ctx.fillStyle = state.grassPattern;
        ctx.fillRect(viewBounds.x1, viewBounds.y1, viewBounds.x2 - viewBounds.x1, viewBounds.y2 - viewBounds.y1);
    }

    const startY = Math.max(0, Math.floor(viewBounds.y1 / CONFIG.GRID_SIZE));
    const endY = Math.min(state.grid.length, Math.ceil(viewBounds.y2 / CONFIG.GRID_SIZE));
    const startX = Math.max(0, Math.floor(viewBounds.x1 / CONFIG.GRID_SIZE));
    const endX = Math.min(state.grid[0]?.length || 0, Math.ceil(viewBounds.x2 / CONFIG.GRID_SIZE));

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const cell = state.grid[y][x];
            if (cell.wear > 0.01) {
                ctx.fillStyle = `rgba(203, 213, 224, ${cell.wear * 0.9})`;
                ctx.fillRect(cell.x * CONFIG.GRID_SIZE, cell.y * CONFIG.GRID_SIZE, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
            }
        }
    }

    const visibleEntities = state.entities.filter(e =>
        e.x + e.radius > viewBounds.x1 && e.x - e.radius < viewBounds.x2 &&
        e.y + e.radius > viewBounds.y1 && e.y - e.radius < viewBounds.y2
    );
    visibleEntities.sort((a, b) => a.y - b.y).forEach(e => e.draw());

    const highlighted = state.selectedObject || state.hoveredObject;
    if (highlighted) {
        ctx.strokeStyle = state.selectedObject === highlighted ? '#2d3748' : '#718096';
        ctx.lineWidth = 2 / state.camera.zoom;
        ctx.setLineDash([4 / state.camera.zoom, 3 / state.camera.zoom]);
        const r = highlighted.radius + 4 / state.camera.zoom;
        ctx.beginPath();
        ctx.arc(highlighted.x, highlighted.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    if (state.buildMode) {
        const info = CONFIG.BUILDING_INFO[state.buildMode];
        const x = Math.round(state.mouse.worldX / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const y = Math.round(state.mouse.worldY / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        ctx.save();
        ctx.translate(x, y);

        OutlineDrawer.draw(ctx, { type: state.buildMode, radius: info.size.w/2, size: info.size });

        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 2 / state.camera.zoom;
        ctx.setLineDash([6 / state.camera.zoom, 4 / state.camera.zoom]);
        ctx.strokeRect(-info.size.w / 2, -info.size.h / 2, info.size.w, info.size.h);
        ctx.setLineDash([]);

        ctx.restore();
    }
    ctx.restore();
    updateUI();
}
function updateUI() {
    document.getElementById('woodCount').textContent = Math.floor(state.resources.wood);
    document.getElementById('stoneCount').textContent = Math.floor(state.resources.stone);
    document.getElementById('foodCount').textContent = Math.floor(state.resources.food);

    const totalPopulation = state.settlers.length;
    const housingCapacity = state.buildings.filter(b => b.type === 'hut' && b.status === 'operational').reduce((sum, b) => sum + (CONFIG.BUILDING_INFO.hut.housing || 0), 0);
    ui.populationDisplay.innerHTML = `${getAssetImg('icon_settler')} <span class="font-semibold">${totalPopulation} / ${housingCapacity}</span>`;
    ui.dayDisplay.innerHTML = `${getAssetImg('icon_day')} <span class="font-semibold">${state.day}</span>`;
    const timeNames = ["Night", "Morning", "Noon", "Evening"];
    ui.timeDisplay.innerHTML = `${getAssetImg('icon_time')} <span class="font-semibold">${timeNames[Math.floor(state.timeOfDay * 4)]}</span>`;

    let assignedCount = 0;
    const adultPopulation = state.settlers.filter(s => s.type === 'settler').length;
    Object.entries(state.jobQuotas).forEach(([jobId, count]) => {
        const el = document.getElementById(`${jobId}Count`);
        if (el) el.textContent = count;
        assignedCount += count;
    });
    ui.idleDisplay.innerHTML = `${getAssetImg('icon_idle')} <span class="font-bold">${Math.max(0, adultPopulation - assignedCount)}</span>`;

    const time = state.timeOfDay;
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
    ui.dayNightOverlay.style.backgroundColor = overlayColor;

    const hasFarm = state.buildings.some(b => b.type === 'farm' && b.status === 'operational');
    const hasLodge = state.buildings.some(b => b.type === 'foresterLodge' && b.status === 'operational');
    document.querySelectorAll('[data-job-controls="farmer"]').forEach(el => el.style.display = hasFarm ? 'flex' : 'none');
    document.querySelectorAll('[data-job-controls="forester"]').forEach(el => el.style.display = hasLodge ? 'flex' : 'none');
    if(!hasFarm && state.jobQuotas.farmer > 0) state.jobQuotas.farmer = 0;
    if(!hasLodge && state.jobQuotas.forester > 0) state.jobQuotas.forester = 0;

    document.getElementById('pauseBtn').classList.toggle('active', state.isPaused);
    document.getElementById('playBtn').classList.toggle('active', !state.isPaused && state.timeScale === 1);
    document.getElementById('ff2Btn').classList.toggle('active', !state.isPaused && state.timeScale === 2);
    document.getElementById('ff4Btn').classList.toggle('active', !state.isPaused && state.timeScale === 4);
}
function updateHoveredObject(e) {
    const rect = gameCanvas.getBoundingClientRect();
    const isOverCanvas = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

    tooltipElement.style.left = `${e.clientX + 15}px`;
    tooltipElement.style.top = `${e.clientY + 15}px`;

    let activeTooltip = false;

    if (isOverCanvas) {
        state.hoveredObject = findClosestEntity({x: state.mouse.worldX, y: state.mouse.worldY}, en => Math.hypot(state.mouse.worldX - en.x, state.mouse.worldY - en.y) < en.radius * 1.2, 32);
        if(state.hoveredObject) {
            tooltipElement.innerHTML = state.hoveredObject.getTooltip();
            activeTooltip = true;
        }
    }

    const uiElement = e.target.closest('[data-tooltip]');
    if (uiElement) {
        tooltipElement.innerHTML = uiElement.dataset.tooltip;
        activeTooltip = true;
    }

    tooltipElement.style.display = activeTooltip ? 'block' : 'none';
}

function addEventListeners() {
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', e => { state.keysPressed[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', e => { state.keysPressed[e.key.toLowerCase()] = false; if (e.key === 'Escape') { state.buildMode = null; gameCanvas.classList.remove('build-mode'); state.selectedObject = null; } });

    window.addEventListener('mousemove', e => {
        const rect = gameCanvas.getBoundingClientRect();
        state.mouse.x = e.clientX - rect.left;
        state.mouse.y = e.clientY - rect.top;
        const worldPos = screenToWorld(state.mouse.x, state.mouse.y);
        state.mouse.worldX = worldPos.x;
        state.mouse.worldY = worldPos.y;
        updateHoveredObject(e);
    });

    gameCanvas.addEventListener('mousedown', e => {
        if (e.button === 0) {
            if (state.buildMode) {
                const x = Math.round(state.mouse.worldX / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
                const y = Math.round(state.mouse.worldY / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
                addBuilding(new Building(state.buildMode, x, y));
                if (!state.keysPressed['shift']) { state.buildMode = null; gameCanvas.classList.remove('build-mode'); }
            } else { state.selectedObject = state.hoveredObject; }
        } else if (e.button === 2) {
            if (state.buildMode) {
                state.buildMode = null; gameCanvas.classList.remove('build-mode');
            } else if (state.hoveredObject && state.hoveredObject.status === 'blueprint') {
                const building = state.hoveredObject;
                Object.entries(building.delivered).forEach(([resource, amount]) => {
                    if (amount > 0) createResourcePile(resource, building.x, building.y, amount);
                });
                removeEntity(building);
                setNotification('Construction cancelled.');
            } else {
                state.selectedObject = null;
            }
        }
    });
    gameCanvas.addEventListener('wheel', e => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        const newZoom = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, state.camera.zoom * zoomFactor));
        const worldPos = screenToWorld(state.mouse.x, state.mouse.y);
        state.camera.zoom = newZoom;
        state.camera.x = worldPos.x - (state.mouse.x - gameCanvas.width / 2) / state.camera.zoom;
        state.camera.y = worldPos.y - (state.mouse.y - gameCanvas.height / 2) / state.camera.zoom;
    }, { passive: false });
    gameCanvas.addEventListener('contextmenu', e => e.preventDefault());

    ui.jobManagement.addEventListener('click', e => {
        const button = e.target.closest('button');
        if (!button || button.disabled) return;
        const job = button.dataset.job; const change = parseInt(button.dataset.change);
        const adultPopulation = state.settlers.filter(s => s.type === 'settler').length;
        const totalAssigned = Object.values(state.jobQuotas).reduce((a, b) => a + b, 0);
        if (change > 0 && totalAssigned < adultPopulation) state.jobQuotas[job]++;
        else if (change < 0 && state.jobQuotas[job] > 0) state.jobQuotas[job]--;
    });
}
function setupUI() {
    ui.resourceDisplay.innerHTML = Object.keys(CONFIG.RESOURCES_INFO).map(id => `
        <div data-tooltip="${CONFIG.RESOURCES_INFO[id].name}" class="flex items-center gap-2">
            ${getAssetImg(id, 'w-6 h-6 inline-block')}
            <span id="${id}Count" class="font-semibold">0</span>
        </div>
    `).join('');

    ui.buildManagement.innerHTML = '';
    Object.entries(CONFIG.BUILDING_INFO).forEach(([id, info]) => {
        const button = document.createElement('button');
        button.className = 'btn p-2 rounded-lg w-full h-16 flex items-center justify-center relative text-center';
        button.textContent = info.name;

        const costString = Object.entries(CONFIG.BUILDING_COSTS[id]).map(([res, val]) => `${getAssetImg(res, 'inline-block w-4 h-4')} ${val}`).join(' ');
        const tooltipContent = `<b>${info.name}</b><br>${info.description}<br>Cost: ${costString}`;
        button.dataset.tooltip = tooltipContent;

        button.addEventListener('click', () => {
             state.buildMode = id;
             gameCanvas.classList.add('build-mode');
        });

        ui.buildManagement.appendChild(button);
    });

    ui.jobManagement.innerHTML = '';
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
        ui.jobManagement.appendChild(div);
    });

    ui.timeControls.innerHTML = `
        <button id="pauseBtn" class="time-control rounded" data-tooltip="Pause (Space)">${getAssetImg('icon_pause', 'w-full h-full p-1')}</button>
        <button id="playBtn" class="time-control rounded active" data-tooltip="Normal Speed (1)">${getAssetImg('icon_play', 'w-full h-full p-1')}</button>
        <button id="ff2Btn" class="time-control rounded" data-tooltip="2x Speed (2)">${getAssetImg('icon_ff2', 'w-full h-full p-1')}</button>
        <button id="ff4Btn" class="time-control rounded" data-tooltip="4x Speed (3)">${getAssetImg('icon_ff4', 'w-full h-full p-1')}</button>
    `;
    document.getElementById('pauseBtn').addEventListener('click', () => { state.isPaused = true; });
    document.getElementById('playBtn').addEventListener('click', () => { state.isPaused = false; state.timeScale = 1; });
    document.getElementById('ff2Btn').addEventListener('click', () => { state.isPaused = false; state.timeScale = 2; });
    document.getElementById('ff4Btn').addEventListener('click', () => { state.isPaused = false; state.timeScale = 4; });
}
const resizeCanvas = () => {
    const container = gameCanvas.parentElement;
    gameCanvas.width = container.offsetWidth;
    gameCanvas.height = container.offsetHeight;
};

// --- START GAME ---
document.addEventListener('DOMContentLoaded', () => {
    initDrawingModal(init);
});
