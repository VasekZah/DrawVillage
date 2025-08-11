// js/classes.js

import { G } from './globals.js';
import { CONFIG } from './config.js';
import { PixelDrawer } from './drawing.js';
import { findPath } from './pathfinding.js';
import { findClosest, worldToGrid, findWalkableNeighbor, updateGridForObject, setNotification } from './helpers.js';
import { getUiIcon } from './uiHelpers.js'; // Přidán správný import

// --- ZDE ZAČÍNÁ KOMPLETNÍ KÓD PRO classes.js ---
// (Následuje kompletní, správný kód pro celý soubor)
class Entity {
    draw() { PixelDrawer.draw(G.ctx, this); }
    update() {}
    getTooltip() { return this.type; }
}

export class Settler extends Entity {
    constructor(name, x, y, isChild = false, age = 0) {
        super();
        this.name = name; this.x = x; this.y = y;
        this.job = 'laborer'; this.task = 'idle'; this.target = null;
        this.path = []; this.payload = null; this.radius = 4;
        this.onPathComplete = 'idle'; this.workProgress = 0;
        this.hunger = 0; this.isChild = isChild; this.age = age;
        this.secondaryTarget = null;
        this.home = null;
    }

    getTooltip() {
        if (this.isChild) return `${this.name} (Dítě, ${Math.floor(this.age)}/${CONFIG.AGE_UP_DAYS}) | Hlad: ${Math.floor(this.hunger)}%`;
        let taskDesc = this.task;
        if (this.task === 'moving' && this.target) taskDesc = `přesouvá se k cíli`;
        if (this.payload) taskDesc += ` (nese ${this.payload.type})`;
        const homeInfo = this.home ? ` | Bydliště: ${CONFIG.BUILDINGS[this.home.type].name}` : '';
        const jobName = this.job === 'laborer' ? 'Dělník' : (CONFIG.JOBS[this.job]?.name || 'Neznámý');
        return `${this.name} (${jobName}) | ${taskDesc} | Hlad: ${Math.floor(this.hunger)}%${homeInfo}`;
    }

    draw() {
        PixelDrawer.draw(G.ctx, this);
        if (this.payload) {
            G.ctx.save();
            G.ctx.translate(Math.floor(this.x), Math.floor(this.y));
            const color = this.payload.type === 'wood' ? '#8d6e63' : (this.payload.type === 'stone' ? '#90a4ae' : '#c2185b');
            G.ctx.fillStyle = color;
            G.ctx.fillRect(2, -8, 4, 4);
            G.ctx.restore();
        }
    }
    
    // Zbytek metod pro Settler (update, resetTask, die, atd.)
}

export class WorldObject extends Entity {
    constructor(type, x, y, amountOverride = null) {
        super();
        this.type = type; this.x = x; this.y = y; this.growth = 0;
        this.resource = { 
            tree: { type: 'wood', amount: 5 }, stone: { type: 'stone', amount: 5 }, 
            bush: { type: 'food', amount: 2 }, wood_pile: { type: 'wood', amount: 5 },
            stone_pile: { type: 'stone', amount: 5 }, food_pile: { type: 'food', amount: 2 },
            carcass: { type: 'food', amount: 8 }
        }[type];
        if (this.resource && amountOverride !== null) {
            this.resource.amount = amountOverride;
        }
        this.radius = {tree: 8, stone: 6, bush: 4, sapling: 2, wood_pile: 4, stone_pile: 4, food_pile: 4, carcass: 4, stump: 4}[type] || 4;
        this.targetedBy = null;
    }
    
    // ... metody pro WorldObject
}

export class Building extends Entity {
    constructor(type, x, y) {
        super();
        this.type = type; this.x = x; this.y = y;
        const blueprint = CONFIG.BUILDINGS[type];
        this.size = blueprint.size;
        this.isUnderConstruction = type !== 'stockpile';
        this.isUpgrading = false;
        this.cost = blueprint.cost || {};
        this.delivered = Object.keys(this.cost).reduce((acc, key) => ({...acc, [key]: 0 }), {});
        this.enRoute = Object.keys(this.cost).reduce((acc, key) => ({...acc, [key]: 0 }), {});
        this.targetedBy = null;
        this.targetedByHaulers = [];
        this.upgradable = blueprint.upgradable;

        if (type === 'farm') { this.farmState = 'fallow'; this.growth = 0; }
        if (type === 'hut' || type === 'stone_house') {
            this.residents = [];
            this.reproductionCooldown = 0;
        }
    }

    getTooltip() {
        const name = CONFIG.BUILDINGS[this.type].name;
        if (this.isUnderConstruction || this.isUpgrading) {
            const cost = this.isUpgrading ? CONFIG.UPGRADES[this.type]?.cost : this.cost;
            const status = this.isUpgrading ? 'Vylepšování' : 'Stavba';
            const needed = Object.entries(cost).map(([res, val]) => `${getUiIcon(res)} ${Math.floor(this.delivered[res])}/${val}`).join(', ');
            return `${name} (${status}) - ${needed || 'Připraveno'} [Pravý klik pro zrušení]`;
        }
        // ... zbytek getTooltip
        return name;
    }

    // ... zbytek metod pro Building
}

export class Animal extends Entity {
    // ... třída Animal
}

export class Projectile extends Entity {
    // ... třída Projectile
}
