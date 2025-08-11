const PALETTE = {
    'T': 'transparent',
    
    // Příroda
    grass_base: '#74b46c',
    grass_dark: '#5a9053',
    tree_trunk: '#7f5539',
    tree_leaves: '#4caf50',
    tree_leaves_dark: '#388e3c',
    stone: '#a8a29e',
    stone_dark: '#78716c',
    
    // Postavy (šablona)
    skin: '#ffc8dd',
    shirt_base: '#d0d0d0',
    pants: '#3d405b',

    // Budovy
    wood_wall: '#e09f3e',
    wood_roof: '#b45309',
    wood_dark: '#9c6644',
    wood_shadow: '#c79248',
    stone_wall: '#c7c7c7',
    stone_dark: '#a8a29e',

    // UI
    job_builder: '#3b82f6',
    job_lumberjack: '#16a34a',
    job_gatherer: '#f97316',
    job_miner: '#78716c',
    job_farmer: '#eab308',
    job_forester: '#84cc16',
    job_hunter: '#ef4444',
    ui_text: '#f1f5f9',
};

function p(ctx, x, y) { ctx.fillRect(x, y, 1, 1); }

export const SPRITE_GENERATORS = {
    _canvasSize: { default: 16, hut: 24, stockpile: 32 },

    settler: (ctx) => {
        ctx.fillStyle = PALETTE.skin;
        for(let y=2; y<5; y++) for(let x=6; x<10; x++) p(ctx,x,y);
        ctx.fillStyle = PALETTE.shirt_base;
        for(let y=5; y<9; y++) for(let x=5; x<11; x++) p(ctx,x,y);
        ctx.fillStyle = PALETTE.pants;
        for(let y=9; y<12; y++) { p(ctx,6,y); p(ctx,7,y); p(ctx,8,y); p(ctx,9,y); }
    },

    tree: (ctx) => {
        const w = 16, h = 16;
        ctx.fillStyle = PALETTE.tree_trunk;
        ctx.fillRect(7, 10, 2, 6);
        ctx.fillStyle = PALETTE.tree_leaves_dark;
        ctx.fillRect(3, 5, 10, 6);
        ctx.fillRect(5, 3, 6, 9);
        ctx.fillStyle = PALETTE.tree_leaves;
        ctx.fillRect(4, 4, 8, 7);
        ctx.fillRect(6, 2, 4, 10);
    },

    stone: (ctx) => {
        const w = 16, h = 16;
        ctx.fillStyle = PALETTE.stone_dark;
        ctx.fillRect(5, 10, 6, 3);
        ctx.fillRect(7, 9, 4, 5);
        ctx.fillStyle = PALETTE.stone;
        ctx.fillRect(6, 9, 6, 3);
        ctx.fillRect(8, 8, 2, 5);
    },
    
    hut: (ctx) => {
        const w = 24, h = 24;
        // Střecha
        ctx.fillStyle = PALETTE.wood_dark;
        ctx.fillRect(2, 6, 20, 8);
        ctx.fillStyle = PALETTE.wood_roof;
        ctx.fillRect(3, 5, 18, 7);
        // Stěny
        ctx.fillStyle = PALETTE.wood_shadow;
        ctx.fillRect(4, 12, 16, 8);
        ctx.fillStyle = PALETTE.wood_wall;
        ctx.fillRect(4, 11, 16, 8);
        // Dveře
        ctx.fillStyle = PALETTE.wood_dark;
        ctx.fillRect(10, 15, 4, 4);
    },

    stockpile: (ctx) => {
        const w = 32, h = 32;
        // Země
        ctx.fillStyle = PALETTE.grass_dark;
        ctx.fillRect(2, 2, 28, 28);
        // Hromádky
        ctx.fillStyle = PALETTE.tree_trunk; // Dřevo
        ctx.fillRect(5, 5, 8, 6);
        ctx.fillStyle = PALETTE.stone; // Kámen
        ctx.fillRect(18, 7, 7, 5);
    },
};

// Aliasy pro UI a další objekty
SPRITE_GENERATORS.child = SPRITE_GENERATORS.settler;
SPRITE_GENERATORS.builder = SPRITE_GENERATORS.settler;
SPRITE_GENERATORS.lumberjack = SPRITE_GENERATORS.settler;
SPRITE_GENERATORS.gatherer = SPRITE_GENERATORS.settler;
SPRITE_GENERATORS.miner = SPRITE_GENERATORS.settler;
SPRITE_GENERATORS.farmer = SPRITE_GENERATORS.settler;
SPRITE_GENERATORS.forester = SPRITE_GENERATORS.settler;
SPRITE_GENERATORS.hunter = SPRITE_GENERATORS.settler;
SPRITE_GENERATORS.wood = (ctx) => { ctx.fillStyle = PALETTE.tree_trunk; ctx.fillRect(4,4,8,8); };
SPRITE_GENERATORS.food = (ctx) => { ctx.fillStyle = '#fde047'; ctx.fillRect(4,4,8,8); };
SPRITE_GENERATORS.day = (ctx) => { ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(8, 8, 6, 0, Math.PI * 2); ctx.fill(); };
SPRITE_GENERATORS.time = (ctx) => { ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.arc(8, 8, 6, 0, Math.PI * 2); ctx.fill(); };
SPRITE_GENERATORS.idle = SPRITE_GENERATORS.settler;
SPRITE_GENERATORS.pause = (ctx) => { ctx.fillStyle = PALETTE.ui_text; ctx.fillRect(4,4,3,8); ctx.fillRect(9,4,3,8); };
SPRITE_GENERATORS.play = (ctx) => { ctx.fillStyle = PALETTE.ui_text; ctx.beginPath(); ctx.moveTo(5, 4); ctx.lineTo(11, 8); ctx.lineTo(5, 12); ctx.closePath(); ctx.fill(); };
SPRITE_GENERATORS.ff2 = SPRITE_GENERATORS.play;
SPRITE_GENERATORS.ff4 = SPRITE_GENERATORS.play;
