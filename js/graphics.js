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
    
    // UI
    ui_background: '#312e2b',
    ui_border: '#a3b18a',
    ui_main_text: '#f1f5f9',
    ui_accent: '#dad7cd',
};

// Funkce, která nakreslí jeden pixel (zvětšený čtverec)
function p(ctx, x, y) {
    ctx.fillRect(x, y, 1, 1);
}

// Databáze "receptů" pro každý sprite
export const SPRITE_GENERATORS = {
    // Velikost plátna pro každý sprite
    _canvasSize: { default: 16 },

    // Generátor pro postavu (šablona)
    settler: (ctx) => {
        ctx.fillStyle = PALETTE.skin; // Hlava
        p(ctx, 7, 1); p(ctx, 8, 1); p(ctx, 7, 2); p(ctx, 8, 2);
        ctx.fillStyle = PALETTE.shirt; // Tělo
        p(ctx, 7, 4); p(ctx, 8, 4); p(ctx, 6, 5); p(ctx, 7, 5); p(ctx, 8, 5); p(ctx, 9, 5);
        p(ctx, 7, 6); p(ctx, 8, 6); p(ctx, 7, 7); p(ctx, 8, 7);
        ctx.fillStyle = PALETTE.pants; // Kalhoty
        p(ctx, 7, 8); p(ctx, 8, 8); p(ctx, 6, 9); p(ctx, 9, 9);
        p(ctx, 6, 10); p(ctx, 9, 10);
    },

    // Generátor pro strom
    tree: (ctx) => {
        ctx.fillStyle = PALETTE.tree_trunk;
        p(ctx, 7, 9); p(ctx, 8, 9); p(ctx, 7, 10); p(ctx, 8, 10); p(ctx, 7, 11); p(ctx, 8, 11);
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

    // Generátor pro kámen
    stone: (ctx) => {
        ctx.fillStyle = PALETTE.stone_dark;
        p(ctx, 5, 11); p(ctx, 6, 11); p(ctx, 9, 11); p(ctx, 10, 11);
        p(ctx, 4, 10); p(ctx, 7, 10); p(ctx, 8, 10);
        ctx.fillStyle = PALETTE.stone;
        p(ctx, 7, 11); p(ctx, 8, 11); p(ctx, 5, 10); p(ctx, 6, 10); p(ctx, 9, 10);
        p(ctx, 6, 9); p(ctx, 7, 9); p(ctx, 8, 9);
        p(ctx, 7, 8);
    },
    
    // A tak dále pro všechny ostatní sprity...
    // Pro jednoduchost zde necháme jen tyto, zbytek se dá snadno doplnit
};

// Doplnění aliasů a jednoduchých spritů
SPRITE_GENERATORS.child = SPRITE_GENERATORS.settler; // Dítě použije stejnou šablonu
SPRITE_GENERATORS.hut = (ctx) => {
    ctx.fillStyle = PALETTE.wood_roof;
    p(ctx, 7, 4); p(ctx, 8, 4); p(ctx, 6, 5); p(ctx, 9, 5); p(ctx, 5, 6); p(ctx, 10, 6);
    ctx.fillStyle = PALETTE.wood_wall;
    for(let i=5; i<11; i++) { p(ctx, i, 7); p(ctx, i, 8); p(ctx, i, 9); p(ctx, i, 10); }
    ctx.fillStyle = PALETTE.wood_dark;
    p(ctx, 7, 8); p(ctx, 8, 8);
};

// ... další generátory pro budovy, suroviny atd. ...
