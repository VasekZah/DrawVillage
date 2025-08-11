export const CONFIG = {
    WORLD_SIZE: 2000, GRID_SIZE: 8, DAY_LENGTH_MS: 240 * 1000, CAMERA_PAN_SPEED: 10,
    MIN_ZOOM: 0.4, MAX_ZOOM: 3.0, SETTLER_SPEED: 0.9, HUNGER_PER_DAY: 100, CARRY_CAPACITY: 10,
    PATH_WEAR_AMOUNT: 0.05, PATH_DECAY_RATE: 0.0000002, PATH_SPEED_BONUS: 1.5,
    FARM_GROWTH_RATE: 0.00001, FARM_TENDING_BONUS: 0.00002,
    FORESTER_LODGE_RADIUS: 200, FORESTER_TREE_DENSITY_TARGET: 5,
    REPRODUCTION_CHANCE_PER_DAY: 0.05, REPRODUCTION_COOLDOWN_DAYS: 3, CHILD_GROW_UP_AGE_DAYS: 4,
    SAPLING_GROW_TIME_MS: 45 * 1000,
    RESOURCES_INFO: {
        wood: { name: 'Dřevo'},
        stone: { name: 'Kámen'},
        food: { name: 'Jídlo'},
    },
    BUILDING_COSTS: {
        hut: { wood: 20 }, 
        stockpile: { wood: 10 }, 
        farm: { wood: 30, stone: 5 },
        foresterLodge: { wood: 40, stone: 10 },
        hunterLodge: { wood: 25, stone: 5 },
    },
    BUILDING_INFO: {
        hut: { name: 'Chatrč', size: { w: 48, h: 48 }, housing: 2, description: 'Základní přístřeší pro 2 osadníky.' },
        stockpile: { name: 'Skladiště', size: { w: 64, h: 64 }, description: 'Ukládá všechny typy surovin.' },
        farm: { name: 'Farma', size: { w: 96, h: 64 }, description: 'Umožňuje pěstování jídla.' },
        foresterLodge: { name: 'Hájovna', size: { w: 56, h: 56 }, description: 'Lesníci sází nové stromy v okolí.' },
        hunterLodge: { name: 'Lovecká chata', size: { w: 56, h: 56 }, description: 'Lovci nosí jídlo z lovu.' },
    },
    JOBS: {
        builder: { name: 'Dělníci', description: 'Staví budovy.', color: '#3b82f6' },
        lumberjack: { name: 'Lesník', description: 'Kácí stromy.', color: '#16a34a' },
        gatherer: { name: 'Sběrač', description: 'Sbírá bobule.', color: '#f97316' },
        miner: { name: 'Kameník', description: 'Těží kámen.', color: '#78716c' },
        farmer: { name: 'Farmář', description: 'Pracuje na farmě.', color: '#eab308' },
        hunter: { name: 'Lovec', description: 'Loví zvěř.', color: '#ef4444' },
    }
};
