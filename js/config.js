export const CONFIG = {
    GRID_SIZE: 10, WORLD_WIDTH: 2000, WORLD_HEIGHT: 2000,
    SETTLER_SPEED: 0.8, PATH_SPEED_BONUS: 1.5, DAY_LENGTH_MS: 60 * 1000,
    CAMERA_PAN_SPEED: 8, MIN_ZOOM: 0.8, MAX_ZOOM: 5.0,
    HUNGER_RATE: 50,
    CHILD_HUNGER_RATE: 25, AGE_UP_DAYS: 5,
    REPRODUCTION_COOLDOWN_DAYS: 4,
    PATH_DECAY_RATE: 0.1,
    FARM_GROWTH_DAYS: 4, FARM_YIELD: 20, FARM_BOOST: 1.5,
    WORK_DURATION: 250, PICKUP_DURATION: 50,
    HUNTING_RANGE: 80,
    ANIMAL_REPRODUCTION_CHANCE: 0.01,
    MAX_ANIMALS: 40,
    INTERACTION_DISTANCE: 15,
    JOBS: {
        builder: { name: 'Stavitel', color: '#3498db' },
        lumberjack: { name: 'Dřevorubec', color: '#e67e22' },
        miner: { name: 'Kameník', color: '#95a5a6' },
        forager: { name: 'Sběrač', color: '#2ecc71' },
        farmer: { name: 'Farmář', color: '#f1c40f', requires: 'farm' },
        forester: { name: 'Lesník', color: '#00695c', requires: 'forestersHut' },
        hunter: { name: 'Lovec', color: '#bf360c', requires: 'huntersLodge' }
    },
    BUILDINGS: {
        hut: { name: 'Chatrč', cost: { wood: 20 }, housing: 2, size: {w: 30, h: 30}, upgradable: true },
        stone_house: { name: 'Kamenný dům', cost: {}, housing: 3, size: {w: 32, h: 32}, upgradable: false },
        stockpile: { name: 'Skladiště', cost: {}, size: {w: 50, h: 50} },
        farm: { name: 'Farma', cost: { wood: 10, stone: 5 }, size: {w: 60, h: 40} },
        forestersHut: { name: 'Hájovna', cost: { wood: 15 }, size: {w: 30, h: 30} },
        huntersLodge: { name: 'Lovecká chata', cost: { wood: 25, stone: 5 }, size: {w: 40, h: 30} },
        well: { name: 'Studna', cost: { stone: 20 }, size: {w: 20, h: 20} }
    },
    UPGRADES: {
          hut: { to: 'stone_house', name: 'Vylepšit na Kamenný dům', cost: { wood: 10, stone: 25 } }
    }
};
