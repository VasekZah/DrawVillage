import { G } from './globals.js';
import { CONFIG } from './config.js';
import { Settler, Building, WorldObject, Child, Humanoid } from './classes.js';
import { SpriteDrawer } from './drawing.js';
import { manageTasks } from './taskManager.js';
import { screenToWorld, addEntity, removeEntity, setNotification, addBuilding, findClosestEntity, createResourcePile } from './helpers.js';
import { getUiIcon as getUiIconFn } from './uiHelpers.js';

// Vytvoříme funkci, která má přístup k interní cache spritů pro UI
const getUiIcon = (name, classes) => {
    // spriteCache je v tomto bodě již naplněn
    const spriteCache = spriteCacheFromDrawer();
    return getUiIconFn(spriteCache, name, classes);
};

// Pomocná funkce pro přístup k cachovaným spritům
const spriteCacheFromDrawer = () => {
    // Tato funkce je jen pro čistší kód, aby se nemusela cache předávat všude
    // Vrací interní cache z SpriteDraweru, která se naplní při startu
    return new Map(); // Dočasně, než se inicializuje
};


document.addEventListener('DOMContentLoaded', () => {
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
        state: {
            resources: { wood: 50, stone: 20, food: 40 },
            entities: [], settlers: [], buildings: [], worldObjects: [], tasks: [], grid: [],
            camera: { x: CONFIG.WORLD_SIZE / 2, y: CONFIG.WORLD_SIZE / 2, zoom: 1.2 },
            mouse: { x: 0, y: 0, worldX: 0, worldY: 0 },
            keysPressed: {}, buildMode: null, hoveredObject: null, selectedObject: null,
            day: 1, timeOfDay: 0, nextId: 0,
            jobQuotas: Object.keys(CONFIG.JOBS).reduce((acc, key) => ({ ...acc, [key]: 0 }), {}),
            isPaused: false,
            timeScale: 1,
            reproductionCooldown: 0,
        }
    });
    G.ctx = G.gameCanvas.getContext('2d', { alpha: false });

    // Generování je synchronní, není potřeba Promise
    SpriteDrawer.generateAndCacheSprites();
    init();
});

function spawnObjects(count, type, minDistance) {
    let placed = 0;
    let attempts = 0;
    const maxAttempts = count * 20;
    while (placed < count && attempts < maxAttempts) {
        const x = (Math.random() * 0.9 + 0.05) * CONFIG.WORLD_SIZE;
        const y = (Math.random() * 0.9 + 0.05) * CONFIG.WORLD_SIZE;
        const closest = findClosestEntity({ x, y }, () => true, minDistance);
        if (!closest) {
            addEntity(new WorldObject(type, x, y));
            placed++;
        }
        attempts++;
    }
     if (placed < count) {
        console.warn(`Could not place all ${type} objects. Only placed ${placed}/${count}.`);
    }
}

function init() {
    resizeCanvas();
    setupUI();
    const gridW = CONFIG.WORLD_SIZE / CONFIG.GRID_SIZE, gridH = CONFIG.WORLD_SIZE / CONFIG.GRID_SIZE;
    for (let y = 0; y < gridH; y++) {
        G.state.grid[y] = [];
        for (let x = 0; x < gridW; x++) G.state.grid[y][x] = { x, y, walkable: true, wear: 0 };
    }
    
    const startX = CONFIG.WORLD_SIZE / 2;
    const startY = CONFIG.WORLD_SIZE / 2;

    addEntity(new Settler(startX, startY));
    addEntity(new Settler(startX + 20, startY));
    addEntity(new Settler(startX - 20, startY));
    const stockpile = new Building('stockpile', startX, startY + 80);
    stockpile.status = 'operational';
    stockpile.buildProgress = 100;
    addBuilding(stockpile);

    spawnObjects(150, 'tree', 25);
    spawnObjects(80, 'stone', 30);
    // spawnObjects(40, 'berryBush', 20);

    addEventListeners();
    setInterval(manageTasks, 1000);
    gameLoop();
}

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
    G.ctx.fillStyle = '#b3c681';
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
    
    const startY = Math.max(0, Math.floor(viewBounds.y1 / CONFIG.GRID_SIZE));
    const endY = Math.min(G.state.grid.length, Math.ceil(viewBounds.y2 / CONFIG.GRID_SIZE));
    const startX = Math.max(0, Math.floor(viewBounds.x1 / CONFIG.GRID_SIZE));
    const endX = Math.min(G.state.grid[0]?.length || 0, Math.ceil(viewBounds.x2 / CONFIG.GRID_SIZE));
    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const cell = G.state.grid[y][x];
            if (cell.wear > 0.01) {
                G.ctx.fillStyle = `rgba(148, 114, 73, ${cell.wear * 0.9})`;
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
        const tempEntity = { type: G.state.buildMode, radius: info.size.w/2, size: info.size, x:0, y:0 };
        G.ctx.globalAlpha = 0.7;
        SpriteDrawer.draw(G.ctx, tempEntity);
        G.ctx.globalAlpha = 1.0;
        G.ctx.strokeStyle = '#2d3748';
        G.ctx.lineWidth = 2 / G.state.camera.zoom;
        G.ctx.strokeRect(-info.size.w / 2, -info.size.h / 2, info.size.w, info.size.h);
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
    G.ui.populationDisplay.innerHTML = `${getUiIcon('settler', 'w-7 h-7')} <span class="font-semibold">${totalPopulation} / ${housingCapacity}</span>`;
    G.ui.dayDisplay.innerHTML = `${getUiIcon('day', 'w-7 h-7')} <span class="font-semibold">${G.state.day}</span>`;
    const timeNames = ["Night", "Morning", "Noon", "Evening"];
    G.ui.timeDisplay.innerHTML = `${getUiIcon('time', 'w-7 h-7')} <span class="font-semibold">${timeNames[Math.floor(G.state.timeOfDay * 4)]}</span>`;
    let assignedCount = 0;
    const adultPopulation = G.state.settlers.filter(s => s.type === 'settler').length;
    Object.entries(G.state.jobQuotas).forEach(([jobId, count]) => {
        const el = document.getElementById(`${jobId}Count`);
        if (el) el.textContent = count;
        assignedCount += count;
    });
    G.ui.idleDisplay.innerHTML = `${getUiIcon('idle', 'w-7 h-7')} <span class="font-bold">${Math.max(0, adultPopulation - assignedCount)}</span>`;
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
        overlayColor = `rgba(${Math.round(r)}, ${Math
