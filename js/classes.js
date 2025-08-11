import { G } from './globals.js';
import { CONFIG } from './config.js';
import { PixelDrawer } from './drawing.js';
import { findPath } from './pathfinding.js';
import { findClosest, worldToGrid, findWalkableNeighbor, updateGridForObject, setNotification } from './helpers.js';

// Base classes
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
    
    // ... all other methods from the provided single-file code
}

export class WorldObject extends Entity {
    // ... implementation from the provided single-file code
}

export class Building extends Entity {
    // ... implementation from the provided single-file code
}

export class Animal extends Entity {
    // ... implementation from the provided single-file code
}

export class Projectile extends Entity {
    // ... implementation from the provided single-file code
}
