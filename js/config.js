// js/config.js
// Centrální konfigurace hry / simulace.
// Snažil jsem se držet názvy a strukturu obecné, aby ladily s ostatními moduly.

export const CONFIG = {
    // ─────────────────────────────────────────────────────────────
    // SVĚT A GRID
    // ─────────────────────────────────────────────────────────────
    GRID_SIZE: 10,                 // 1 tile = 10 px
    WORLD_WIDTH: 2000,             // px
    WORLD_HEIGHT: 2000,            // px

    // ─────────────────────────────────────────────────────────────
    // KAMERA A ZOOM
    // ─────────────────────────────────────────────────────────────
    CAMERA_PAN_SPEED: 8,           // px/frame při držení šipek
    MIN_ZOOM: 0.8,
    MAX_ZOOM: 5.0,
    INITIAL_ZOOM: 1.5,

    // ─────────────────────────────────────────────────────────────
    // ČAS
    // ─────────────────────────────────────────────────────────────
    DAY_LENGTH_MS: 60 * 1000,      // 1 den = 60s (lze měnit)
    WORK_DURATION: 250,            // ms „práce“ na akci (sekání, těžba…)
    PICKUP_DURATION: 120,          // ms zvedání/pokládání

    // ─────────────────────────────────────────────────────────────
    // POHYB A CESTY
    // ─────────────────────────────────────────────────────────────
    SETTLER_SPEED: 0.8,            // základní rychlost osadníků (px / frame při ~60fps)
    PATH_SPEED_BONUS: 1.5,         // násobič rychlosti na cestičce
    PATH_DECAY_RATE: 0.1,          // rychlost „vyblednutí“ cesty (0–1) za den

    // ─────────────────────────────────────────────────────────────
    // HUNGER / VĚK / REPRODUKCE
    // ─────────────────────────────────────────────────────────────
    HUNGER_RATE: 50,               // kolik „hladu“ přibude za den (dospělí)
    CHILD_HUNGER_RATE: 25,         // děti hladoví pomaleji
    AGE_UP_DAYS: 5,                // z dítěte dospělý
    REPRODUCTION_COOLDOWN_DAYS: 4, // cooldown mezi porody

    // ─────────────────────────────────────────────────────────────
    // FARMAŘENÍ
    // ─────────────────────────────────────────────────────────────
    FARM_GROWTH_DAYS: 4,
    FARM_YIELD: 20,
    FARM_BOOST: 1.5,               // bonus k růstu u farmy (např. fertilní půda)

    // ─────────────────────────────────────────────────────────────
    // ZVÍŘATA
    // ─────────────────────────────────────────────────────────────
    ANIMAL_SPAWN_CHANCE: 0.002,    // šance na spawn za tick (globální)
    ANIMAL_DESPAWN_DAYS: 8,        // po kolika dnech může zvíře zmizet
    ANIMAL_HUNTING_RANGE: 80,      // px pro lovce
    ANIMAL_REPRODUCTION_CHANCE: 0.01,

    // ─────────────────────────────────────────────────────────────
    // ŠANCE NA OBJEKTY V TERÉNU (kvítí/kamínky apod.)
    // ─────────────────────────────────────────────────────────────
    DECOR_CHANCE: 0.05,            // 5% že se na tile objeví dekor (květina, kamínek)

    // ─────────────────────────────────────────────────────────────
    // ZDROJE
    // ─────────────────────────────────────────────────────────────
    RESOURCES: {
        wood: { stack: 30, weight: 1 },
        stone: { stack: 30, weight: 2 },
        food: { stack: 30, weight: 1 },
    },

    // ─────────────────────────────────────────────────────────────
    // ROLE (JOBS)
    // Pozn.: barvy se využívají ve vykreslování (např. PixelDrawer.settler)
    // ─────────────────────────────────────────────────────────────
    JOBS: {
        laborer:      { label: 'Dělník',       color: '#795548' }, // základní práce / nošení
        builder:      { label: 'Stavitel',     color: '#8d6e63' },
        farmer:       { label: 'Farmář',       color: '#7cb342' },
        forester:     { label: 'Lesník',       color: '#2e7d32' },
        hunter:       { label: 'Lovec',        color: '#6d4c41' },
        miner:        { label: 'Kameník',      color: '#607d8b' },
        waterCarrier: { label: 'Nosič vody',   color: '#1e88e5' },
    },

    // Kolik rolí má být (maxima / kvóty) – může si přepsat UI.
    DEFAULT_JOB_QUOTAS: {
        laborer: 2,
        builder: 1,
        farmer: 1,
        forester: 1,
        hunter: 1,
        miner: 1,
        waterCarrier: 0,
    },

    // ─────────────────────────────────────────────────────────────
    // BUDOVY
    // Typy budov a jejich základní parametry
    // ─────────────────────────────────────────────────────────────
    BUILDINGS: {
        hut: {
            label: 'Chatrč',
            capacity: 2,                  // kolik lidí může bydlet
            cost: { wood: 20 },
        },
        stone_house: {
            label: 'Kamenný dům',
            capacity: 4,
            cost: { wood: 15, stone: 25 },
        },
        stockpile: {
            label: 'Skladiště (volná plocha)',
            capacity: 999,                // prakticky neomezená hromada
            cost: { wood: 5 },
        },
        farm: {
            label: 'Farma',
            capacity: 0,
            cost: { wood: 10 },
        },
        forestersHut: {
            label: 'Lesovna',
            capacity: 0,
            cost: { wood: 15 },
        },
        huntersLodge: {
            label: 'Lovecká chata',
            capacity: 0,
            cost: { wood: 15, stone: 5 },
        },
        well: {
            label: 'Studna',
            capacity: 0,
            cost: { stone: 20 },
        },
    },

    // ─────────────────────────────────────────────────────────────
    // ENTITY TYPY (pro renderer / logiku)
    // ─────────────────────────────────────────────────────────────
    ENTITY_TYPES: {
        settler: 'settler',
        child: 'child',
        deer: 'deer',
        boar: 'boar',
        rabbit: 'rabbit',
        wood_pile: 'wood_pile',
        stone_pile: 'stone_pile',
        food_pile: 'food_pile',
        carcass: 'carcass',
        tree: 'tree',
        stump: 'stump',
        rock: 'rock',
        bush: 'bush',
        flower: 'flower',
        pebble: 'pebble',
        building: 'building',
        arrow: 'arrow',
    },

    // ─────────────────────────────────────────────────────────────
    // UI / VZHLED (volitelné, pro pohodlí)
    // ─────────────────────────────────────────────────────────────
    COLORS: {
        ground: '#2a3c35',
        path: '#a1887f',
        gridLine: '#263238',
        hudBg: 'rgba(0,0,0,0.35)',
        hudBorder: 'rgba(255,255,255,0.1)',
    }
};
