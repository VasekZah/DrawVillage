// Barevná paleta pro celou hru. Zde můžete snadno měnit barvy.
const PALETTE = {
    // Příroda
    grass_dark: '#588157',
    grass_light: '#a3b18a',
    tree_trunk: '#4e342e',
    tree_leaves: '#4caf50',
    tree_leaves_dark: '#388e3c',
    stone: '#a1a1aa',
    stone_dark: '#71717a',
    water: '#457b9d',
    dirt: '#a16207',

    // Postavy (šablona)
    skin: '#ffebd1',
    shirt: '#e2e8f0',
    pants: '#64748b',

    // Budovy
    wood_wall: '#d2b48c',
    wood_roof: '#a16207',
    wood_dark: '#8c6d31',
    
    // Suroviny a UI
    food_straw: '#facc15',
    ui_red: '#ef4444',
    ui_blue: '#3b82f6',
    ui_green: '#22c55e',
    ui_yellow: '#eab308',
    ui_gray: '#6b7280',
    ui_orange: '#f97316',
    ui_main_text: '#f1f5f9',
};

// Funkce, která nakreslí jeden pixel (zvětšený čtverec)
function p(ctx, x, y) {
    ctx.fillRect(x, y, 1, 1);
}

// Databáze "receptů" pro každý sprite
export const SPRITE_GENERATORS = {
    _canvasSize: { default: 16 },

    settler: (ctx) => {
        ctx.fillStyle = PALETTE.skin; // Hlava
        p(ctx, 7, 1); p(ctx, 8, 1); p(ctx, 7, 2); p(ctx, 8, 2);
        ctx.fillStyle = PALETTE.shirt; // Tělo
        for(let y=3; y<8; y++) for(let x=6; x<10; x++) p(ctx, x, y);
        p(ctx,5,4); p(ctx, 10, 4);
        ctx.fillStyle = PALETTE.pants; // Kalhoty
        for(let y=8; y<11; y++) for(let x=6; x<10; x++) p(ctx, x, y);
        p(ctx, 6, 11); p(ctx, 9, 11);
    },
    child: (ctx) => {
        ctx.fillStyle = PALETTE.skin;
        p(ctx, 7, 3); p(ctx, 8, 3); p(ctx, 7, 4); p(ctx, 8, 4);
        ctx.fillStyle = PALETTE.shirt;
        for(let y=5; y<9; y++) for(let x=6; x<10; x++) p(ctx, x, y);
        ctx.fillStyle = PALETTE.pants;
        p(ctx, 6, 9); p(ctx, 9, 9); p(ctx, 6, 10); p(ctx, 9, 10);
    },
    tree: (ctx) => {
        ctx.fillStyle = PALETTE.tree_trunk;
        for(let y=9; y<16; y++) { p(ctx, 7, y); p(ctx, 8, y); }
        ctx.fillStyle = PALETTE.tree_leaves_dark;
        p(ctx, 6, 4); p(ctx, 9, 4); p(ctx, 5, 5); p(ctx, 10, 5); p(ctx, 4, 6);
        p(ctx, 11, 6); p(ctx, 5, 7); p(ctx, 10, 7); p(ctx, 6, 8); p(ctx, 9, 8);
        ctx.fillStyle = PALETTE.tree_leaves;
        p(ctx, 7, 2); p(ctx, 8, 2); p(ctx, 6, 3); p(ctx, 7, 3); p(ctx, 8, 3); p(ctx, 9, 3);
        p(ctx, 5, 4); p(ctx, 7, 4); p(ctx, 8, 4); p(ctx, 4, 5); p(ctx, 6, 5);
        p(ctx, 7, 5); p(ctx, 8, 5); p(ctx, 9, 5); p(ctx, 6, 6); p(ctx, 7, 6);
        p(ctx, 8, 6); p(ctx, 9, 6); p(ctx, 10, 6); p(ctx, 6, 7); p(ctx, 7, 7);
        p(ctx, 8, 7); p(ctx, 9, 7); p(ctx, 7, 8); p(ctx, 8, 8);
    },
    stone: (ctx) => {
        ctx.fillStyle = PALETTE.stone_dark;
        p(ctx, 5, 11); p(ctx, 9, 11); p(ctx, 4, 10); p(ctx, 7, 10); p(ctx, 8, 10);
        ctx.fillStyle = PALETTE.stone;
        p(ctx, 6, 11);p(ctx, 7, 11); p(ctx, 8, 11); p(ctx, 5, 10); p(ctx, 6, 10); p(ctx, 9, 10);
        p(ctx, 6, 9); p(ctx, 7, 9); p(ctx, 8, 9); p(ctx, 7, 8);
    },
    hut: (ctx) => {
        ctx.fillStyle = PALETTE.wood_roof;
        for(let y=3; y<7; y++) for(let x=y; x<16-y; x++) p(ctx, x, y);
        ctx.fillStyle = PALETTE.wood_wall;
        for(let y=7; y<12; y++) for(let x=4; x<12; x++) p(ctx, x, y);
        ctx.fillStyle = PALETTE.wood_dark;
        for(let y=7; y<12; y++) p(ctx, 4, y);
        for(let x=4; x<12; x++) p(ctx, x, 11);
        p(ctx, 7, 9); p(ctx, 8, 9);
    },
    stockpile: (ctx) => {
        ctx.fillStyle = PALETTE.wood_dark;
        for(let i=2; i<14; i++) { p(ctx, i, 2); p(ctx, i, 13); p(ctx, 2, i); p(ctx, 13, i); }
        ctx.fillStyle = PALETTE.wood_wall;
        p(ctx, 4,4); p(ctx, 5,4); p(ctx, 4,5); p(ctx, 5,5);
        ctx.fillStyle = PALETTE.stone;
        p(ctx, 9,4); p(ctx, 10,4); p(ctx, 9,5); p(ctx, 10,5);
        ctx.fillStyle = PALETTE.food_straw;
        p(ctx, 4,9); p(ctx, 5,9); p(ctx, 4,10); p(ctx, 5,10);
    },
    wood: (ctx) => { ctx.fillStyle = PALETTE.tree_trunk; for(let y=5; y<11; y++) for(let x=4; x<12; x++) p(ctx, x, y); },
    food: (ctx) => { ctx.fillStyle = PALETTE.food_straw; for(let y=5; y<11; y++) for(let x=4; x<12; x++) p(ctx, x, y); },
    day: (ctx) => { ctx.fillStyle = PALETTE.ui_yellow; for(let y=4; y<12; y++) for(let x=4; x<12; x++) p(ctx, x, y); },
    time: (ctx) => { ctx.fillStyle = PALETTE.ui_gray; for(let y=4; y<12; y++) for(let x=4; x<12; x++) p(ctx, x, y); },
    idle: (ctx) => { ctx.fillStyle = PALETTE.ui_gray; p(ctx,7,4);p(ctx,8,4); for(let y=5; y<11; y++) for(let x=6; x<10; x++) p(ctx,x,y); },
    builder: (ctx) => { ctx.fillStyle = PALETTE.ui_blue; for(let y=4; y<12; y++) for(let x=4; x<12; x++) p(ctx, x, y); },
    lumberjack: (ctx) => { ctx.fillStyle = PALETTE.ui_green; for(let y=4; y<12; y++) for(let x=4; x<12; x++) p(ctx, x, y); },
    pause: (ctx) => { ctx.fillStyle = PALETTE.ui_main_text; for(let y=4; y<12; y++) { p(ctx,5,y); p(ctx,6,y); p(ctx,9,y); p(ctx,10,y); } },
    play: (ctx) => { ctx.fillStyle = PALETTE.ui_main_text; p(ctx,5,4);p(ctx,6,5);p(ctx,7,6);p(ctx,8,7);p(ctx,7,8);p(ctx,6,9);p(ctx,5,10); },
};
SPRITE_GENERATORS.wood_pile = SPRITE_GENERATORS.wood;
SPRITE_GENERATORS.stone_pile = SPRITE_GENERATORS.stone;
SPRITE_GENERATORS.food_pile = SPRITE_GENERATORS.food;
SPRITE_GENERATORS.wood_carry = SPRITE_GENERATORS.wood;
SPRITE_GENERATORS.stone_carry = SPRITE_GENERATORS.stone;
SPRITE_GENERATORS.food_carry = SPRITE_GENERATORS.food;
