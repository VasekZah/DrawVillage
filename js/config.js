// --- GAME CONFIGURATION AND STATE ---
export const CONFIG = {
    WORLD_SIZE: 2000, GRID_SIZE: 8, DAY_LENGTH_MS: 240 * 1000, CAMERA_PAN_SPEED: 10,
    MIN_ZOOM: 0.4, MAX_ZOOM: 3.0, SETTLER_SPEED: 0.9, HUNGER_PER_DAY: 100, CARRY_CAPACITY: 10,
    PATH_WEAR_AMOUNT: 0.05, PATH_DECAY_RATE: 0.0000002, PATH_SPEED_BONUS: 1.5,
    FARM_GROWTH_RATE: 0.00001, FARM_TENDING_BONUS: 0.00002,
    FORESTER_LODGE_RADIUS: 200, FORESTER_TREE_DENSITY_TARGET: 5,
    REPRODUCTION_CHANCE_PER_DAY: 0.05, REPRODUCTION_COOLDOWN_DAYS: 3, CHILD_GROW_UP_AGE_DAYS: 4,
    SAPLING_GROW_TIME_MS: 45 * 1000,
    RESOURCES_INFO: {
        wood: { name: 'Wood'},
        stone: { name: 'Stone'},
        food: { name: 'Food'},
    },
    BUILDING_COSTS: {
        hut: { wood: 25 }, stockpile: { wood: 10 }, farm: { wood: 30 }, mine: { wood: 50, stone: 20 },
        foresterLodge: { wood: 40, stone: 10 },
    },
    BUILDING_INFO: {
        hut: { name: 'Hut', size: { w: 48, h: 48 }, housing: 2, description: 'Basic housing for 2 settlers.' },
        stockpile: { name: 'Stockpile', size: { w: 64, h: 64 }, description: 'Stores all types of resources.' },
        mine: { name: 'Mine', size: { w: 64, h: 48 }, description: 'Generates stone slowly when worked.' },
        farm: { name: 'Farm', size: { w: 96, h: 64 }, description: 'Allows growing food. Unlocks the Farmer job.' },
        foresterLodge: { name: 'Forester Lodge', size: { w: 56, h: 56 }, description: 'Foresters plant new trees nearby. Unlocks the Forester job.' },
    },
    JOBS: {
        builder: { name: 'Builder', description: 'Constructs buildings.' },
        lumberjack: { name: 'Lumberjack', description: 'Chops down trees.' },
        gatherer: { name: 'Gatherer', description: 'Gathers berries from bushes.' },
        miner: { name: 'Miner', description: 'Mines stone from deposits or in a mine.' },
        farmer: { name: 'Farmer', description: 'Plants and harvests crops on farms. Requires a Farm.' },
        forester: { name: 'Forester', description: 'Plants new trees. Requires a Forester Lodge.' },
    }
};

export const state = {
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
};

export const userAssets = {}; // Stores DataURLs
export const loadedUserAssets = {}; // Stores Image objects

export const ui = {
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
};

export const gameCanvas = document.getElementById('gameCanvas');
export const ctx = gameCanvas.getContext('2d', { alpha: false });
export const tooltipElement = document.getElementById('tooltip');
