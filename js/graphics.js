const PALETTE = {
    'T': 'transparent',
    skin: '#ffc8dd',
    shirt_base: '#d0d0d0',
    pants: '#3d405b',
    hair: '#592f2a',
    
    tree_trunk: '#7f5539',
    tree_leaves: '#588157',
    tree_leaves_dark: '#3a5a40',
    
    stone: '#a8a29e',
    stone_dark: '#78716c',
    
    berry_bush: '#6a994e',
    berry: '#e63946',
    
    wood_wall: '#e09f3e',
    wood_roof: '#9c6644',
    wood_dark: '#7f5539',

    food_straw: '#fde047',

    ui_text: '#f1f5f9',
    job_builder: '#0077b6',
    job_lumberjack: '#588157',
    job_gatherer: '#f97316',
    job_miner: '#78716c',
};

function p(ctx, x, y) { ctx.fillRect(x, y, 1, 1); }

export const SPRITE_GENERATORS = {
    _canvasSize: { default: 16 },

    settler: (ctx) => {
        ctx.fillStyle = PALETTE.hair;
        for(let x=6; x<10; x++) p(ctx,x,2);
        p(ctx,5,3); p(ctx,10,3);
        ctx.fillStyle = PALETTE.skin;
        for(let y=3; y<6; y++) for(let x=6; x<10; x++) p(ctx,x,y);
        ctx.fillStyle = PALETTE.shirt_base;
        for(let y=6; y<10; y++) for(let x=5; x<11; x++) p(ctx,x,y);
        ctx.fillStyle = PALETTE.pants;
        for(let y=10; y<13; y++) { p(ctx,6,y); p(ctx,7,y); p(ctx,8,y); p(ctx,9,y); }
    },

    tree: (ctx) => {
        ctx.fillStyle = PALETTE.tree_trunk;
        for(let y=10; y<16; y++) { p(ctx,7,y); p(ctx,8,y); }
        ctx.fillStyle = PALETTE.tree_leaves;
        ctx.beginPath();
        ctx.arc(8, 7, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.tree_leaves_dark;
        ctx.beginPath();
        ctx.arc(10, 8, 3, 0, Math.PI * 2);
        ctx.fill();
    },

    stone: (ctx) => {
        ctx.fillStyle = PALETTE.stone_dark;
        ctx.fillRect(4, 9, 8, 4);
        ctx.fillStyle = PALETTE.stone;
        ctx.beginPath();
        ctx.moveTo(4, 10);
        ctx.lineTo(8, 6);
        ctx.lineTo(12, 10);
        ctx.closePath();
        ctx.fill();
    },
    
    berryBush: (ctx) => {
        ctx.fillStyle = PALETTE.tree_leaves_dark;
        ctx.beginPath();
        ctx.arc(8, 10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.berry_bush;
        ctx.beginPath();
        ctx.arc(8, 9, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.berry;
        p(ctx,6,8); p(ctx, 10, 9); p(ctx, 8, 11);
    },

    hut: (ctx) => {
        ctx.fillStyle = PALETTE.wood_roof;
        ctx.beginPath();
        ctx.moveTo(1, 8);
        ctx.lineTo(8, 2);
        ctx.lineTo(15, 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PALETTE.wood_wall;
        ctx.fillRect(3, 8, 10, 6);
        ctx.fillStyle = PALETTE.wood_dark;
        ctx.fillRect(6, 10, 4, 4);
    },

    stockpile: (ctx) => {
        ctx.fillStyle = PALETTE.wood_dark;
        for(let i=1; i<15; i++) { p(ctx, i, 1); p(ctx, i, 14); p(ctx, 1, i); p(ctx, 14, i); }
        ctx.fillStyle = PALETTE.tree_trunk;
        ctx.fillRect(3, 3, 4, 4);
        ctx.fillStyle = PALETTE.stone;
        ctx.fillRect(9, 3, 4, 4);
        ctx.fillStyle = PALETTE.food_straw;
        ctx.fillRect(3, 9, 4, 4);
    },
};

// Aliasy a jednoduché ikony pro UI
SPRITE_GENERATORS.child = SPRITE_GENERATORS.settler;
SPRITE_GENERATORS.wood = (ctx) => { ctx.fillStyle = PALETTE.tree_trunk; ctx.fillRect(4,4,8,8); };
SPRITE_GENERATORS.food = (ctx) => { ctx.fillStyle = PALETTE.food_straw; ctx.fillRect(4,4,8,8); };
SPRITE_GENERATORS.day = (ctx) => { ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(8, 8, 6, 0, Math.PI * 2); ctx.fill(); };
SPRITE_GENERATORS.time = (ctx) => { ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.arc(8, 8, 6, 0, Math.PI * 2); ctx.fill(); };
SPRITE_GENERATORS.idle = SPRITE_GENERATORS.settler;
SPRITE_GENERATORS.builder = SPRITE_GENERATORS.settler;
SPRITE_GENERATORS.lumberjack = SPRITE_GENERATORS.settler;
SPRITE_GENERATORS.gatherer = SPRITE_GENERATORS.settler;
SPRITE_GENERATORS.miner = SPRITE_GENERATORS.settler;
SPRITE_GENERATORS.wood_pile = SPRITE_GENERATORS.wood;
SPRITE_GENERATORS.stone_pile = SPRITE_GENERATORS.stone;
SPRITE_GENERATORS.food_pile = SPRITE_GENERATORS.food;
SPRITE_GENERATORS.wood_carry = SPRITE_GENERATORS.wood;
SPRITE_GENERATORS.stone_carry = SPRITE_GENERATORS.stone;
SPRITE_GENERATORS.food_carry = SPRITE_GENERATORS.food;
SPRITE_GENERATORS.pause = (ctx) => { ctx.fillStyle = PALETTE.ui_text; ctx.fillRect(4,4,3,8); ctx.fillRect(9,4,3,8); };
SPRITE_GENERATORS.play = (ctx) => { ctx.fillStyle = PALETTE.ui_text; ctx.beginPath(); ctx.moveTo(5, 4); ctx.lineTo(11, 8); ctx.lineTo(5, 12); ctx.closePath(); ctx.fill(); };
SPRITE_GENERATORS.ff2 = SPRITE_GENERATORS.play;
SPRITE_GENERATORS.ff4 = SPRITE_GENERATORS.play;
