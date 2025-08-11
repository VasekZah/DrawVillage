// js/drawing.js
import { G } from './globals.js';
import { CONFIG } from './config.js';

/**
 * Jednoduchý „pixel“ renderer pro entity ve světě.
 * - Žádné vedlejší efekty; pouze kreslení do kontextu.
 * - Každá entita má typ (entity.type), podle kterého se zvolí kreslící funkce.
 * - Kreslíme kolem (0,0); volající nás posune na entity.x, entity.y.
 */
export const PixelDrawer = {
    /**
     * Vstupní bod: zvolí správný kreslič podle typu entity.
     */
    draw: (ctx, entity) => {
        if (!ctx || !entity) return;
        ctx.save();
        // Snažíme se držet integer pozice, aby „pixely“ nebyly rozmazané
        ctx.translate(Math.floor(entity.x), Math.floor(entity.y));

        // Mapa typu -> kreslič
        // Děti a osadníci: pokud je isChild, kreslí se jako child
        let drawer = null;
        if (entity.type && PixelDrawer[entity.type]) {
            drawer = PixelDrawer[entity.type];
        } else if (entity.isChild) {
            drawer = PixelDrawer.child;
        } else if (entity.job) {
            drawer = PixelDrawer.settler;
        }

        if (drawer) {
            drawer(ctx, entity);
        } else {
            // Fallback – malé šedé kolečko, ať je něco vidět
            ctx.fillStyle = '#9e9e9e';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    },

    // ─────────────────────────────
    // L I D É
    // ─────────────────────────────
    settler: (ctx, entity) => {
        // lehký „bob“ efekt při chůzi
        const isMoving = Array.isArray(entity?.path) && entity.path.length > 0;
        const t = performance.now() * (isMoving ? 0.02 : 0.01);
        const bob = Math.sin(t) * (isMoving ? 1.2 : 0.4);

        // hlava
        ctx.fillStyle = '#fbeee4';
        ctx.fillRect(-2, -9 + bob, 4, 4);

        // trup (barva podle role)
        const roleColor = entity?.job ? (CONFIG.JOBS[entity.job]?.color || '#795548') : '#795548';
        ctx.fillStyle = roleColor;
        ctx.fillRect(-3, -5 + bob, 6, 5);

        // nohy
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(-3, 0 + bob, 2, 4);
        ctx.fillRect(1, 0 + bob, 2, 4);

        // jednoduchá „nálož“ zdroje na zádech, pokud něco nese
        if (entity?.payload?.type) {
            ctx.fillStyle = entity.payload.type === 'wood' ? '#6d4c41'
                : entity.payload.type === 'stone' ? '#90a4ae'
                : entity.payload.type === 'food' ? '#c2185b'
                : '#616161';
            ctx.fillRect(3, -5 + bob, 3, 3);
        }
    },

    child: (ctx, entity) => {
        const t = performance.now() * 0.02;
        const bob = Math.sin(t) * 0.8;

        ctx.fillStyle = '#fbeee4';
        ctx.fillRect(-1, -6 + bob, 3, 3);

        ctx.fillStyle = '#8bc34a';
        ctx.fillRect(-2, -3 + bob, 5, 4);

        ctx.fillStyle = '#33691e';
        ctx.fillRect(-2, 1 + bob, 2, 3);
        ctx.fillRect(1, 1 + bob, 2, 3);
    },

    // ─────────────────────────────
    // Z V Í Ř A T A
    // ─────────────────────────────
    deer: (ctx/*, entity*/) => {
        ctx.fillStyle = '#a1887f';
        ctx.fillRect(-5, -6, 10, 6);
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(-6, -10, 4, 4); // hlava
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-5, -12, 2, 3); // parůžek L
        ctx.fillRect(-3, -12, 2, 3); // parůžek R
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(-4, 0, 2, 4);
        ctx.fillRect(2, 0, 2, 4);
    },

    boar: (ctx/*, entity*/) => {
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-6, -5, 12, 6);
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(-8, -4, 3, 4); // rypák
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(-4, 1, 2, 3);
        ctx.fillRect(2, 1, 2, 3);
    },

    rabbit: (ctx/*, entity*/) => {
        ctx.fillStyle = '#efebe9';
        ctx.fillRect(-3, -4, 6, 5);
        ctx.fillStyle = '#d7ccc8';
        ctx.fillRect(-1, -7, 2, 4); // ucho
    },

    // ─────────────────────────────
    // Z Á S O B Y  (piles)
    // ─────────────────────────────
    wood_pile: (ctx) => {
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(-5, 0, 10, 3);
        ctx.fillRect(-4, -3, 8, 3);
        ctx.fillRect(-2, -6, 4, 3);
    },

    stone_pile: (ctx) => {
        ctx.fillStyle = '#90a4ae';
        ctx.fillRect(-5, 0, 5, 4);
        ctx.fillRect(0, -2, 4, 6);
        ctx.fillRect(-3, -4, 6, 4);
    },

    food_pile: (ctx) => {
        ctx.fillStyle = '#c2185b';
        ctx.fillRect(-4, 0, 8, 4);
        ctx.fillStyle = '#ad1457';
        ctx.fillRect(-3, -2, 6, 2);
    },

    carcass: (ctx) => {
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-5, 0, 10, 4);
        ctx.fillStyle = '#795548';
        ctx.fillRect(-4, -2, 8, 2);
    },

    // ─────────────────────────────
    // O B J E K T Y  (svět)
    // ─────────────────────────────
    tree: (ctx) => {
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(-2, -6, 4, 6);
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(-6, -14, 12, 10);
    },

    stump: (ctx) => {
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(-4, 0, 8, 3);
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(-3, -2, 6, 2);
    },

    rock: (ctx) => {
        ctx.fillStyle = '#90a4ae';
        ctx.fillRect(-5, -3, 10, 6);
        ctx.fillStyle = '#b0bec5';
        ctx.fillRect(-2, -5, 4, 2);
    },

    bush: (ctx) => {
        ctx.fillStyle = '#388e3c';
        ctx.fillRect(-5, -3, 10, 6);
    },

    flower: (ctx) => {
        ctx.fillStyle = '#f06292';
        ctx.fillRect(-1, -3, 2, 2);
        ctx.fillStyle = '#43a047';
        ctx.fillRect(-1, -1, 2, 2);
    },

    pebble: (ctx) => {
        ctx.fillStyle = '#bdbdbd';
        ctx.fillRect(-1, -1, 2, 2);
    },

    // ─────────────────────────────
    // B U D O V Y
    // typy: hut, stone_house, stockpile, farm, forestersHut, huntersLodge, well
    // ─────────────────────────────
    building: (ctx, entity) => {
        // fallback, pokud by přišel neznámý typeBuilding
        PixelDrawer.hut(ctx, entity);
    },

    hut: (ctx/*, entity*/) => {
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(-15, -10, 30, 20);
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(-17, -12, 34, 6); // střecha
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(-3, 0, 6, 10); // dveře
    },

    stone_house: (ctx/*, entity*/) => {
        ctx.fillStyle = '#90a4ae';
        ctx.fillRect(-16, -12, 32, 24);
        ctx.fillStyle = '#b0bec5';
        ctx.fillRect(-18, -14, 36, 6); // střecha
        ctx.fillStyle = '#546e7a';
        ctx.fillRect(-4, 2, 8, 10); // dveře
        ctx.fillRect(6, -4, 6, 6);  // okno
        ctx.fillRect(-12, -4, 6, 6); // okno
    },

    stockpile: (ctx/*, entity*/) => {
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(-25, 20, 50, 5); // palisáda
        // pár „beden“
        ctx.fillStyle = '#bcaaa4';
        ctx.fillRect(-20, -10, 15, 15);
        ctx.fillStyle = '#a1887f';
        ctx.fillRect(5, -10, 15, 15);
    },

    farm: (ctx/*, entity*/) => {
        ctx.fillStyle = '#a1887f';
        ctx.fillRect(-30, -20, 60, 40);
        // záhony
        ctx.fillStyle = '#6d4c41';
        for (let i = -24; i <= 24; i += 12) {
            ctx.fillRect(i, -18, 8, 36);
        }
    },

    forestersHut: (ctx/*, entity*/) => {
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(-15, -10, 30, 20);
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(-6, -20, 12, 10); // „stromek“ vedle
    },

    huntersLodge: (ctx/*, entity*/) => {
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(-18, -12, 36, 24);
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(-4, 2, 8, 10); // dveře
        // trofej „parohy“
        ctx.fillStyle = '#795548';
        ctx.fillRect(-2, -12, 4, 4);
        ctx.fillRect(-5, -14, 3, 3);
        ctx.fillRect(2, -14, 3, 3);
    },

    well: (ctx/*, entity*/) => {
        ctx.fillStyle = '#90a4ae';
        ctx.fillRect(-10, 0, 20, 6); // kamenný okraj
        ctx.fillStyle = '#64b5f6';
        ctx.fillRect(-8, -2, 16, 4); // voda
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(-12, -8, 24, 3); // trám
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(-2, -8, 4, 8);  // rumpál
    },

    // ─────────────────────────────
    // P R O J E K T I L
    // ─────────────────────────────
    arrow: (ctx, entity) => {
        const angle = entity?.angle || 0;
        ctx.rotate(angle);
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(0, -1, 10, 2);    // tělo šípu
        ctx.fillStyle = '#efebe9';
        ctx.fillRect(8, -2, 4, 4);     // letky
    }
};
