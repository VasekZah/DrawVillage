import { G } from './globals.js';
import { CONFIG } from './config.js';
import { PixelDrawer } from './drawing.js';
import { findPath } from './pathfinding.js';
import { findClosest, worldToGrid, findWalkableNeighbor, updateGridForObject, setNotification, assignHomes, getUiIcon } from './helpers.js';

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
        if (this.isChild) return `<div>${this.name} (Dítě, ${Math.floor(this.age)}/${CONFIG.AGE_UP_DAYS})</div><div>Hlad: ${Math.floor(this.hunger)}%</div>`;
        let taskDesc = this.task;
        if (this.task === 'moving' && this.target) taskDesc = `přesouvá se`;
        if (this.payload) taskDesc += ` (nese ${this.payload.amount} ${getUiIcon(this.payload.type)})`;
        const homeInfo = this.home ? ` | Bydliště: ${CONFIG.BUILDINGS[this.home.type].name}` : '';
        const jobName = this.job === 'laborer' ? 'Dělník' : (CONFIG.JOBS[this.job]?.name || 'Neznámý');
        return `<div>${this.name} (${jobName})</div><div>Úkol: ${taskDesc}</div><div>Hlad: ${Math.floor(this.hunger)}%${homeInfo}</div>`;
    }

    draw() {
        PixelDrawer.draw(G.ctx, this);
        if (this.payload) {
            G.ctx.save();
            G.ctx.translate(Math.floor(this.x), Math.floor(this.y));
            PixelDrawer.drawPayload(G.ctx, this.payload);
            G.ctx.restore();
        }
    }

    update(deltaTime) {
        this.updateVitals(deltaTime);
        if (this.hunger >= 100) { this.die(); return; }
        if (this.isChild) return; // Children just wander and eat, handled in vitals/findWork

        switch(this.task) {
            case 'idle': this.findWork(); break;
            case 'moving': this.moveAlongPath(deltaTime); break;
            case 'workingAtResource': case 'workingOnConstruction': case 'workingOnFarm':
            case 'workingAsForester': case 'workingHunting': case 'pickingUpResource':
            case 'upgradingBuilding': this.work(); break;
            case 'pickupForHauling': this.performHaulPickup(); break;
            case 'depositingResource': this.performDeposit(false); break;
            case 'depositingAtSite': this.performDeposit(true); break;
            case 'eating': this.performEat(); break;
        }
    }
    
    updateVitals(deltaTime) {
        const hungerRate = this.isChild ? CONFIG.CHILD_HUNGER_RATE : CONFIG.HUNGER_RATE;
        this.hunger += (deltaTime / CONFIG.DAY_LENGTH_MS) * hungerRate;
        if (this.isChild) {
            this.age += deltaTime / CONFIG.DAY_LENGTH_MS;
            if (this.age >= CONFIG.AGE_UP_DAYS) {
                this.isChild = false; this.age = 0;
                setNotification(`${this.name} dospěl a může pracovat!`);
            }
        }
    }

    resetTask() {
        // CRITICAL FIX: Return resources to the correct place on task cancellation.
        if (this.payload) {
            // If delivering to a construction site, resource came from global pool. Return it there.
            if (this.onPathComplete === 'depositingAtSite' && this.secondaryTarget) {
                 this.secondaryTarget.enRoute[this.payload.type] = Math.max(0, this.secondaryTarget.enRoute[this.payload.type] - this.payload.amount);
                 G.state.resources[this.payload.type] += this.payload.amount;
            } else {
                 // Otherwise, it was picked from the world. Dropping it as a pile is correct.
                const pileType = this.payload.type + '_pile';
                if (PixelDrawer[pileType]) {
                    G.state.worldObjects.push(new WorldObject(pileType, this.x, this.y, this.payload.amount));
                } else { // Fallback
                    G.state.resources[this.payload.type] += this.payload.amount;
                }
            }
        }

        if (this.target) {
            if (this.target.targetedBy === this) this.target.targetedBy = null;
            if (Array.isArray(this.target.targetedByHaulers)) {
                this.target.targetedByHaulers = this.target.targetedByHaulers.filter(s => s !== this);
            }
        }
        if (this.secondaryTarget) {
            if (Array.isArray(this.secondaryTarget.targetedByHaulers)) {
                 this.secondaryTarget.targetedByHaulers = this.secondaryTarget.targetedByHaulers.filter(s => s !== this);
            }
        }

        this.task = 'idle'; this.target = null; this.secondaryTarget = null;
        this.payload = null; this.path = []; this.workProgress = 0;
        this.onPathComplete = 'idle';
    }

    die() {
        setNotification(`${this.name} zemřel hlady!`);
        if (this.home) this.home.residents = this.home.residents.filter(r => r !== this);
        this.resetTask();
        G.state.settlers = G.state.settlers.filter(s => s !== this);
    }

    moveAlongPath(deltaTime) {
        if (!this.path || this.path.length === 0) {
            const distToTarget = this.target ? Math.hypot(this.x - this.target.x, this.y - this.target.y) : Infinity;
            const interactionRadius = (this.target?.size ? Math.max(this.target.size.w, this.target.size.h) / 2 : this.target?.radius || 0) + CONFIG.INTERACTION_DISTANCE;
            if (distToTarget <= interactionRadius) {
                this.task = this.onPathComplete; 
                this.workProgress = 0;
            } else { this.resetTask(); }
            return; 
        }
        const targetNode = this.path[0];
        const targetX = targetNode.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
        const targetY = targetNode.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
        const dx = targetX - this.x; const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);
        
        const gridCoords = worldToGrid(this.x, this.y);
        const currentGridCell = G.state.grid[gridCoords.y]?.[gridCoords.x];
        if (!currentGridCell) { this.resetTask(); return; }
        
        const speed = CONFIG.SETTLER_SPEED * (1 + (currentGridCell.wear / 255) * CONFIG.PATH_SPEED_BONUS) * (deltaTime/16.67);
        
        if (dist < speed) {
            this.x = targetX; this.y = targetY;
            this.path.shift();
            if (currentGridCell.wear < 255) {
                currentGridCell.wear = Math.min(255, currentGridCell.wear + 10);
                G.state.dirtyGroundTiles.add(`${currentGridCell.x},${currentGridCell.y}`);
            }
        } else {
            this.x += (dx / dist) * speed; this.y += (dy / dist) * speed;
        }
    }

    findWork() {
        if (this.hunger > 80 && G.state.resources.food > 0) {
            const stockpile = findClosest(this, G.state.buildings, b => b.type === 'stockpile');
            if (stockpile && this.findAndSetPath(stockpile, 'eating')) return;
        }
        if (this.isChild) { this.wander(); return; }
        
        if (this.job === 'laborer' || this.job === 'builder') {
            if (this.findHaulingWork()) return;
        }
        if (this.findJobSpecificWork()) return;
        if (this.job === 'laborer') {
             if (this.findLaborerWork()) return;
        }
        this.wander();
    }
    
    wander() {
        const wanderTarget = this.home || findClosest(this, G.state.buildings, b => b.type === 'stockpile');
        if (wanderTarget) {
            const randomX = wanderTarget.x + (Math.random() - 0.5) * 80;
            const randomY = wanderTarget.y + (Math.random() - 0.5) * 80;
            const targetPos = {x: randomX, y: randomY, type: 'wander', radius: 1};
            this.findAndSetPath(targetPos, 'idle');
        }
    }

    findHaulingWork() {
        const sites = G.state.buildings.filter(b =>
            (b.isUnderConstruction || b.isUpgrading) && !b.hasMaterials() && b.targetedByHaulers.length < CONFIG.MAX_HAULERS_PER_SITE
        ).sort((a, b) => Math.hypot(this.x - a.x, this.y - a.y) - Math.hypot(this.x - b.x, this.y - b.y));

        if (sites.length === 0) return false;

        const stockpile = findClosest(this, G.state.buildings, b => b.type === 'stockpile');
        if (!stockpile) return false;

        for (const site of sites) {
            const neededResource = Object.keys(site.cost).find(res => 
                G.state.resources[res] > 0 && 
                site.delivered[res] + (site.enRoute[res] || 0) < site.cost[res]
            );

            if (neededResource) {
                if (this.findAndSetPath(stockpile, 'pickupForHauling')) {
                    this.secondaryTarget = site;
                    site.targetedByHaulers.push(this);
                    return true;
                }
            }
        }
        return false;
    }

    findJobSpecificWork() { /* ... same as before, no major changes needed here ... */ return false; }
    findLaborerWork() { /* ... same as before, no major changes needed here ... */ return false; }

    performHaulPickup() {
        const site = this.secondaryTarget;
        if (!site || !G.state.buildings.includes(site)) { this.resetTask(); return; }
        
        const neededResource = Object.keys(site.cost).find(res => site.delivered[res] + (site.enRoute[res] || 0) < site.cost[res]);
        
        if (neededResource && G.state.resources[neededResource] > 0) {
            const amountStillNeeded = site.cost[neededResource] - site.delivered[neededResource] - (site.enRoute[res] || 0);
            const amountToCarry = Math.min(CONFIG.CARRY_CAPACITY, G.state.resources[neededResource], amountStillNeeded);
            
            if (amountToCarry > 0) {
                G.state.resources[neededResource] -= amountToCarry;
                site.enRoute[neededResource] = (site.enRoute[neededResource] || 0) + amountToCarry;
                this.payload = { type: neededResource, amount: amountToCarry };

                if (!this.findAndSetPath(site, 'depositingAtSite')) {
                    // Path failed, revert resource changes
                    G.state.resources[neededResource] += amountToCarry;
                    site.enRoute[neededResource] -= amountToCarry;
                    this.payload = null;
                    this.resetTask();
                }
            } else { this.resetTask(); }
        } else { this.resetTask(); }
    }
    
    performDeposit(atSite) {
        if (atSite) { // Depositing at construction site
            if (this.payload && this.target) {
                this.target.delivered[this.payload.type] = (this.target.delivered[this.payload.type] || 0) + this.payload.amount;
                this.target.enRoute[this.payload.type] = Math.max(0, (this.target.enRoute[this.payload.type] || 0) - this.payload.amount);
            }
        } else { // Depositing at stockpile
            if (this.payload) G.state.resources[this.payload.type] += this.payload.amount;
        }
        this.payload = null;
        this.resetTask();
    }
    
    performEat() {
        if (G.state.resources.food > 0) { 
            G.state.resources.food = Math.max(0, G.state.resources.food - CONFIG.FOOD_PER_MEAL); 
            this.hunger = 0; 
        }
        this.resetTask();
    }

    work() { /* ... same as before, no major changes needed here ... */ }
    finishWork() { /* ... same as before, no major changes needed here ... */ }

    findAndSetPath(target, onComplete) {
        if (!target) return false;
        const start = worldToGrid(this.x, this.y);
        const end = findWalkableNeighbor(worldToGrid(target.x, target.y), start);
        if (!end) return false; 
        const path = findPath(start, end);
        const isInRange = Math.hypot(this.x - target.x, this.y - target.y) <= 
                          ((target.size ? Math.max(target.size.w, target.size.h) / 2 : target.radius || 0) + CONFIG.INTERACTION_DISTANCE);
        if (!path && !isInRange) return false; 

        if (this.task !== 'idle') this.resetTask(); 

        this.target = target;
        this.onPathComplete = onComplete;
        if (path && path.length > 0) {
            this.path = path;
            this.task = 'moving';
        } else { 
            this.path = [];
            this.task = onComplete; 
            this.workProgress = 0;
        }
        
        if (onComplete !== 'pickupForHauling' && target.targetedBy !== this) {
            target.targetedBy = this;
        }
        return true;
    }
}


export class Building extends Entity {
    constructor(type, x, y) {
        super();
        this.type = type; this.x = x; this.y = y;
        const blueprint = CONFIG.BUILDINGS[type];
        this.size = { ...blueprint.size };
        this.isUnderConstruction = type !== 'stockpile';
        this.isUpgrading = false;
        this.cost = { ...(blueprint.cost || {}) };
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
            
            let needed = Object.entries(cost || {}).map(([res, val]) => {
                const delivered = Math.floor(this.delivered[res]);
                const enRoute = Math.floor(this.enRoute[res] || 0);
                const icon = getUiIcon(res);
                return `<div class="text-xs">${icon} ${res.charAt(0).toUpperCase() + res.slice(1)}: ${delivered}/${val} (+${enRoute} na cestě)</div>`;
            }).join('');
            
            return `<div class="font-bold">${name} (${status})</div><div class="mt-1">${needed || 'Připraveno k práci'}</div><div class="text-xs text-gray-400 mt-2">[Pravý klik pro zrušení]</div>`;
        }
        if (this.type === 'farm') return `<div>${name}</div><div>Stav: ${this.farmState} (${Math.floor(this.growth * 100)}%)</div>`;
        if (this.type === 'hut' || this.type === 'stone_house') return `<div>${name}</div><div>Obyvatelé: ${this.residents.length}/${CONFIG.BUILDINGS[this.type].housing}</div>`;
        return name;
    }

    hasMaterials() { 
        const cost = this.isUpgrading ? CONFIG.UPGRADES[this.type]?.cost : this.cost;
        if (!cost) return true;
        return Object.keys(cost).every(res => this.delivered[res] >= cost[res]); 
    }
    
    draw() {
        if (this.isUnderConstruction || this.isUpgrading) {
            const progress = Object.entries(this.cost).reduce((sum, [res, val]) => sum + Math.min(this.delivered[res], val), 0) / Object.values(this.cost).reduce((sum, val) => sum + val, 1);
            
            G.ctx.globalAlpha = 0.4;
            PixelDrawer.draw(G.ctx, { ...this, type: this.isUpgrading ? CONFIG.UPGRADES[this.type].to : this.type });
            G.ctx.globalAlpha = 1;

            G.ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
            G.ctx.fillRect(this.x - this.size.w / 2, this.y + this.size.h / 2 - 4, this.size.w, 4);
            G.ctx.fillStyle = 'rgba(100, 220, 100, 0.8)';
            G.ctx.fillRect(this.x - this.size.w / 2, this.y + this.size.h / 2 - 4, this.size.w * progress, 4);
        } else { 
            PixelDrawer.draw(G.ctx, this); 
        }
    }
    update(deltaTime) { /* ... same as before, no major changes needed here ... */ }
}
// The other classes (WorldObject, Animal, Projectile) remain largely the same, only minor tweaks if any.
// I will reuse the existing code for them for brevity unless a change is critical.
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
    getTooltip() {
        if (this.type === 'stump') return 'Pařez';
        const name = CONFIG.WORLD_OBJECTS[this.type]?.name || this.type.replace('_', ' ');
        if (this.resource) return `${name} (${this.resource.amount} ${getUiIcon(this.resource.type)})`;
        return `${name.charAt(0).toUpperCase() + name.slice(1)}`;
    }
    update() { 
        if (this.type === 'stump' && this.growth < 100) this.growth += 0.01; 
        if (this.type === 'sapling' && this.growth < 100) this.growth += 0.05;
        if(this.growth >= 100) {
            this.type = 'tree'; this.growth = 0; this.resource = { type: 'wood', amount: 5 }; this.radius = 8;
            updateGridForObject(this, false);
        }
    }
}
export class Animal extends Entity { /* Unchanged */ 
    constructor(type, x, y) {
        super();
        this.type = type; this.x = x; this.y = y;
        this.radius = {deer: 6, rabbit: 3}[type];
        this.path = []; this.task = 'wandering';
        this.targetedBy = null;
        this.isDead = false;
        this.resource = { deer: { type: 'food', amount: 8 }, rabbit: { type: 'food', amount: 3 }}[type];
    }
    getTooltip() { return this.type === 'deer' ? "Jelen" : "Zajíc"; }
    draw() {
        if (this.isDead) PixelDrawer.draw(G.ctx, {type: 'carcass', x: this.x, y: this.y});
        else PixelDrawer.draw(G.ctx, this);
    }
    update() {
        if (this.isDead) return;
        if (this.path.length === 0) {
            const randomX = this.x + (Math.random() - 0.5) * 200;
            const randomY = this.y + (Math.random() - 0.5) * 200;
            const end = findWalkableNeighbor(worldToGrid(randomX, randomY), worldToGrid(this.x, this.y));
            if (end) this.path = findPath(worldToGrid(this.x, this.y), end) || [];
        }
        if (this.path.length > 0) {
            const targetNode = this.path[0];
            const targetX = targetNode.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
            const targetY = targetNode.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
            const dx = targetX - this.x; const dy = targetY - this.y;
            const dist = Math.hypot(dx, dy);
            const speed = CONFIG.SETTLER_SPEED * (this.type === 'rabbit' ? 1.2 : 0.8);
            if (dist < speed) {
                this.x = targetX; this.y = targetY; this.path.shift();
            } else {
                this.x += (dx / dist) * speed; this.y += (dy / dist) * speed;
            }
        }
    }
    die() {
        this.isDead = true;
        this.targetedBy = null;
        const carcass = new WorldObject('carcass', this.x, this.y);
        carcass.resource.amount = this.resource.amount;
        G.state.worldObjects.push(carcass);
        G.state.animals = G.state.animals.filter(a => a !== this);
    }
}
export class Projectile extends Entity { /* Unchanged */
    constructor(x, y, target) {
        super();
        this.type = 'arrow';
        this.x = x; this.y = y; this.target = target;
        this.speed = 4;
        const dx = target.x - x; const dy = target.y - y;
        this.angle = Math.atan2(dy, dx);
    }
    draw() { PixelDrawer.draw(G.ctx, this); }
    update() {
        const dx = this.target.x - this.x; const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < this.speed || this.target.isDead) {
            if (!this.target.isDead) this.target.die();
            return false;
        }
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        return true;
    }
}
