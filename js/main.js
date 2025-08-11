import { G } from './globals.js';
import { CONFIG } from './config.js';
import { Settler, Building, WorldObject, Child, Humanoid } from './classes.js';
import { SpriteDrawer } from './drawing.js';
import { manageTasks } from './taskManager.js';
import { screenToWorld, addEntity, removeEntity, setNotification, addBuilding, findClosestEntity, createResourcePile } from './helpers.js';
import { getUiIcon } from './uiHelpers.js';

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
    G.ctx = G.gameCanvas.getContext('2d');

    SpriteDrawer.generateAndCacheSprites();
    init();
});

function spawnObjects(count, type, minDistance, amount, exclusionZones = []) {
    let placed = 0;
    let attempts = 0;
    const maxAttempts = count * 20;

    while (placed < count && attempts < maxAttempts) {
        const x = (Math.random() * 0.9 + 0.05) * CONFIG.WORLD_SIZE;
        const y = (Math.random() * 0.9 + 0.05) * CONFIG.WORLD_SIZE;
        const closest = findClosestEntity({ x, y }, () => true, minDistance);
        
        let isInExclusionZone = false;
        for(const zone of exclusionZones) {
            if (x > zone.x - zone.radius && x < zone.x + zone.radius &&
                y > zone.y - zone.radius && y < zone.y + zone.radius) {
                isInExclusionZone = true;
                break;
            }
        }

        if (!closest && !isInExclusionZone) {
            addEntity(new WorldObject(type, x, y, amount));
            placed++;
        }
        attempts++;
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

    const exclusionZone = { x: stockpile.x, y: stockpile.y, radius: stockpile.radius + 40 };

    spawnObjects(150, 'tree', 25, 5, [exclusionZone]);
    spawnObjects(80, 'stone', 30, 5, [exclusionZone]);
    spawnObjects(40, 'berryBush', 20, 5, [exclusionZone]);

    addEventListeners();
    setInterval(manageTasks, 1000);
    gameLoop();
}

// ... zbytek souboru `main.js` je beze změny
