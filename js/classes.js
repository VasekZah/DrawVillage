import { G } from './globals.js';
import { CONFIG } from './config.js';
import { PixelDrawer } from './drawing.js';
import { findPath } from './pathfinding.js';
import { findClosest, worldToGrid, findWalkableNeighbor, updateGridForObject, setNotification, assignHomes } from './helpers.js';

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

    update(deltaTime) {
        const hungerRate = this.isChild ? CONFIG.CHILD_HUNGER_RATE : CONFIG.HUNGER_RATE;
        this.hunger += (deltaTime / CONFIG.DAY_LENGTH_MS) * hungerRate;
        if (this.hunger >= 100) { this.die(); return; }

        if (this.isChild) {
            this.age += deltaTime / CONFIG.DAY_LENGTH_MS;
            if (this.age >= CONFIG.AGE_UP_DAYS) {
                this.isChild = false;
                this.age = 0;
                setNotification(`${this.name} dospěl a může pracovat!`);
            }
        }
        
        switch(this.task) {
            case 'idle': this.findWork(); break;
            case 'moving': this.moveAlongPath(); break;
            case 'workingAtResource':
            case 'workingOnConstruction':
            case 'workingOnFarm':
            case 'workingAsForester':
            case 'workingHunting':
            case 'pickingUpResource':
            case 'upgradingBuilding':
                this.work();
                break;
            case 'pickupForHauling':
                const site = this.secondaryTarget;
                if (!site || !G.state.buildings.includes(site)) { this.resetTask(); break; }
                
                const neededResource = Object.keys(site.cost).find(res => site.delivered[res] + (site.enRoute[res] || 0) < site.cost[res]);
                
                if (neededResource && G.state.resources[neededResource] > 0) {
                    const amountStillNeeded = site.cost[neededResource] - site.delivered[neededResource] - (site.enRoute[neededResource] || 0);
                    const amountToCarry = Math.min(5, G.state.resources[neededResource], amountStillNeeded);
                    
                    if (amountToCarry > 0) {
                        this.payload = { type: neededResource, amount: amountToCarry };
                        G.state.resources[neededResource] -= amountToCarry;
                        site.enRoute[neededResource] = (site.enRoute[neededResource] || 0) + amountToCarry;
                        if (!this.findAndSetPath(site, 'depositingAtSite')) {
                            G.state.resources[neededResource] += amountToCarry;
                            site.enRoute[neededResource] -= amountToCarry;
                            this.resetTask();
                        }
                    } else {
                        this.resetTask();
                    }
                } else {
                    this.resetTask();
                }
                break;
            case 'depositingResource':
                if (this.payload) G.state.resources[this.payload.type] += this.payload.amount;
                this.payload = null;
                this.resetTask();
                break;
            case 'depositingAtSite':
                if (this.payload && this.target) {
                    this.target.delivered[this.payload.type] += this.payload.amount;
                    if (this.target.enRoute) {
                        this.target.enRoute[this.payload.type] = Math.max(0, (this.target.enRoute[this.payload.type] || 0) - this.payload.amount);
                    }
                }
                this.payload = null;
                this.resetTask();
                break;
            case 'eating':
                if (G.state.resources.food > 0) { G.state.resources.food--; this.hunger = 0; }
                this.resetTask();
                break;
        }
    }

    resetTask() {
        if (this.payload) {
            if (this.onPathComplete === 'depositingAtSite' && this.secondaryTarget && this.secondaryTarget.enRoute) {
                   this.secondaryTarget.enRoute[this.payload.type] = Math.max(0, this.secondaryTarget.enRoute[this.payload.type] - this.payload.amount);
            }
            const pileType = this.payload.type + '_pile';
            if (PixelDrawer[pileType]) {
                G.state.worldObjects.push(new WorldObject(pileType, this.x, this.y, this.payload.amount));
            } else { 
                G.state.resources[this.payload.type] += this.payload.amount;
            }
        }

        if (this.target) {
            if (this.target.targetedBy === this) {
                this.target.targetedBy = null;
            }
            if (Array.isArray(this.target.targetedByHaulers)) {
                this.target.targetedByHaulers = this.target.targetedByHaulers.filter(s => s !== this);
            }
        }
        if (this.secondaryTarget) {
             if (this.secondaryTarget.targetedBy === this) {
                this.secondaryTarget.targetedBy = null;
            }
            if (Array.isArray(this.secondaryTarget.targetedByHaulers)) {
                this.secondaryTarget.targetedByHaulers = this.secondaryTarget.targetedByHaulers.filter(s => s !== this);
            }
        }

        this.task = 'idle';
        this.target = null;
        this.secondaryTarget = null;
        this.payload = null;
        this.path = [];
        this.workProgress = 0;
        this.onPathComplete = 'idle';
    }

    die() {
        setNotification(`${this.name} zemřel hlady!`);
        if (this.home) this.home.residents = this.home.residents.filter(r => r !== this);
        
        this.resetTask();
        G.state.settlers = G.state.settlers.filter(s => s !== this);
    }

    moveAlongPath() {
        if (!this.path || this.path.length === 0) {
            const distToTarget = this.target ? Math.hypot(this.x - this.target.x, this.y - this.target.y) : Infinity;
            const interactionRadius = (this.target?.size ? Math.max(this.target.size.w, this.target.size.h) / 2 : this.target?.radius || 0) + CONFIG.INTERACTION_DISTANCE;
            if (distToTarget <= interactionRadius) {
                this.task = this.onPathComplete; 
                this.workProgress = 0;
            } else {
                this.resetTask();
            }
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
        
        const speed = CONFIG.SETTLER_SPEED * (1 + (currentGridCell.wear / 255) * CONFIG.PATH_SPEED_BONUS);
        
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
        this.resetTask();
        if (this.hunger > 80 && G.state.resources.food > 0) {
            const stockpile = findClosest(this, G.state.buildings, b => b.type === 'stockpile');
            if (stockpile && this.findAndSetPath(stockpile, 'eating')) return;
        }
        if (this.isChild) {
            const wanderTarget = this.home || findClosest(this, G.state.buildings, b => b.type === 'stockpile');
            if (wanderTarget) {
                const randomX = wanderTarget.x + (Math.random() - 0.5) * 80;
                const randomY = wanderTarget.y + (Math.random() - 0.5) * 80;
                this.findAndSetPath({x: randomX, y: randomY, type: 'wander'}, 'idle');
            }
            return;
        }
        
        if (this.job === 'laborer' || this.job === 'builder') {
            if (this.findHaulingWork()) return;
        }

        if (this.findJobSpecificWork()) return;
        
        if (this.job === 'laborer') {
             if (this.findLaborerWork()) return;
        }

        const wanderTarget = this.home || findClosest(this, G.state.buildings, b => b.type === 'stockpile');
        if (wanderTarget) {
            const randomX = wanderTarget.x + (Math.random() - 0.5) * 80;
            const randomY = wanderTarget.y + (Math.random() - 0.5) * 80;
            this.findAndSetPath({x: randomX, y: randomY, type: 'wander'}, 'idle');
        }
    }
    
    findHaulingWork() {
        const sites = G.state.buildings.filter(b =>
            (b.isUnderConstruction || b.isUpgrading) &&
            !b.hasMaterials() &&
            b.targetedByHaulers.length < 2
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
                const stockpileGridPos = findWalkableNeighbor(worldToGrid(stockpile.x, stockpile.y), worldToGrid(this.x, this.y));
                const siteGridPos = findWalkableNeighbor(worldToGrid(site.x, site.y), worldToGrid(stockpile.x, stockpile.y));
                
                if (!stockpileGridPos || !siteGridPos || !findPath(stockpileGridPos, siteGridPos)) {
                    continue;
                }

                if (this.findAndSetPath(stockpile, 'pickupForHauling')) {
                    this.secondaryTarget = site;
                    site.targetedByHaulers.push(this);
                    return true;
                }
            }
        }
        return false;
    }

    findJobSpecificWork() {
        const stockpile = findClosest(this, G.state.buildings, b => b.type === 'stockpile');
        if (!stockpile) return false;

        let target;
        switch(this.job) {
            case 'builder':
                target = findClosest(this, G.state.buildings, b => (b.isUnderConstruction || b.isUpgrading) && b.hasMaterials() && !b.targetedBy);
                if (target && this.findAndSetPath(target, target.isUnderConstruction ? 'workingOnConstruction' : 'upgradingBuilding')) {
                    return true;
                }
                break;
            case 'lumberjack':
            case 'miner':
                const resourceType = this.job === 'lumberjack' ? 'tree' : 'stone';
                const resources = G.state.worldObjects.filter(o => o.type === resourceType && !o.targetedBy)
                    .sort((a, b) => Math.hypot(this.x - a.x, this.y - a.y) - Math.hypot(this.x - b.x, this.y - b.y));
                
                for (const resource of resources) {
                    const resourcePos = findWalkableNeighbor(worldToGrid(resource.x, resource.y), worldToGrid(this.x, this.y));
                    const stockpilePos = findWalkableNeighbor(worldToGrid(stockpile.x, stockpile.y), worldToGrid(resource.x, resource.y));
                    if(resourcePos && stockpilePos && findPath(resourcePos, stockpilePos)) {
                        if (this.findAndSetPath(resource, 'workingAtResource')) {
                            return true;
                        }
                    }
                }
                break;
            case 'forager':
                target = findClosest(this, G.state.worldObjects, o => o.type === 'bush' && !o.targetedBy);
                if (target && this.findAndSetPath(target, 'workingAtResource')) return true;
                break;
            case 'farmer':
                target = findClosest(this, G.state.buildings, b => b.type === 'farm' && !b.isUnderConstruction && (b.farmState === 'fallow' || b.farmState === 'harvestable') && !b.targetedBy);
                if (target && this.findAndSetPath(target, 'workingOnFarm')) return true;
                break;
            case 'forester':
                const hut = findClosest(this, G.state.buildings, b => b.type === 'forestersHut' && !b.isUnderConstruction);
                if (hut) {
                    const randomX = hut.x + (Math.random() - 0.5) * 100;
                    const randomY = hut.y + (Math.random() - 0.5) * 100;
                    const gridPos = findWalkableNeighbor(worldToGrid(randomX, randomY), worldToGrid(this.x, this.y));
                    if (gridPos && this.findAndSetPath({x: gridPos.x * CONFIG.GRID_SIZE, y: gridPos.y * CONFIG.GRID_SIZE, type: 'plantingsite'}, 'workingAsForester')) return true;
                }
                break;
            case 'hunter':
                target = findClosest(this, G.state.animals, a => !a.isDead && !a.targetedBy, CONFIG.HUNTING_RANGE);
                if (target && this.findAndSetPath(target, 'workingHunting')) return true;
                break;
        }
        return false;
    }

    findLaborerWork() {
        const stockpile = findClosest(this, G.state.buildings, b => b.type === 'stockpile');
        if (!stockpile) return false;

        const resourcePiles = G.state.worldObjects.filter(o => 
            (o.type === 'wood_pile' || o.type === 'stone_pile' || o.type === 'carcass' || o.type === 'food_pile') && !o.targetedBy
        ).sort((a, b) => Math.hypot(this.x - a.x, this.y - a.y) - Math.hypot(this.x - b.x, this.y - b.y));

        for (const pile of resourcePiles) {
            const pileGridPos = findWalkableNeighbor(worldToGrid(pile.x, pile.y), worldToGrid(this.x, this.y));
            const stockpileGridPos = findWalkableNeighbor(worldToGrid(stockpile.x, stockpile.y), worldToGrid(pile.x, pile.y));

            if (pileGridPos && stockpileGridPos && findPath(pileGridPos, stockpileGridPos)) {
                if (this.findAndSetPath(pile, 'pickingUpResource')) {
                    return true;
                }
            }
        }
        return false;
    }

    work() {
        const duration = this.task === 'pickingUpResource' ? CONFIG.PICKUP_DURATION : CONFIG.WORK_DURATION;
        if (!this.target) { this.resetTask(); return; }
        
        const distToTarget = Math.hypot(this.x - this.target.x, this.y - this.target.y);
        const interactionRadius = (this.target.size ? Math.max(this.target.size.w, this.target.size.h) / 2 : this.target.radius || 0) + CONFIG.INTERACTION_DISTANCE;
        if (distToTarget > interactionRadius) {
            if (this.task !== 'moving') this.resetTask();
            return;
        }

        if (this.task === 'pickingUpResource' && !G.state.worldObjects.includes(this.target)) { this.resetTask(); return; }
        if ((this.task === 'workingAtResource') && (!this.target.resource || this.target.type === 'stump')) { this.resetTask(); return; }
        if ((this.task === 'workingOnConstruction' || this.task === 'upgradingBuilding') && !this.target.isUnderConstruction && !this.target.isUpgrading) { this.resetTask(); return; }

        this.workProgress++;
        if (this.workProgress >= duration) this.finishWork();
    }
    
    finishWork() {
        if (!this.target) { this.resetTask(); return; }
        const isWorldObjectTask = this.task === 'workingAtResource' || this.task === 'pickingUpResource';
        if (isWorldObjectTask && (!G.state.worldObjects.includes(this.target) || !this.target.resource)) {
            this.resetTask();
            return;
        }

        switch(this.task) {
            case 'workingAtResource':
                if (!this.target.resource || this.target.type === 'stump') {
                    this.resetTask();
                    return;
                }
                
                if (this.target.type === 'bush') {
                    this.payload = { ...this.target.resource };
                    G.state.worldObjects = G.state.worldObjects.filter(o => o !== this.target);
                    const stockpile = findClosest(this, G.state.buildings, b => b.type === 'stockpile');
                    if (!stockpile || !this.findAndSetPath(stockpile, 'depositingResource')) {
                        const droppedPileType = this.payload.type + '_pile';
                        if (PixelDrawer[droppedPileType]) G.state.worldObjects.push(new WorldObject(droppedPileType, this.x, this.y));
                        this.resetTask();
                    }
                    return;
                }

                const pileType = this.target.resource.type + '_pile';
                if (PixelDrawer[pileType]) {
                    const newPile = new WorldObject(pileType, this.target.x, this.target.y);
                    newPile.resource.amount = this.target.resource.amount;
                    G.state.worldObjects.push(newPile);
                }
                if (this.target.type === 'tree') {
                    this.target.type = 'stump'; this.target.growth = 0; this.target.resource = null;
                    updateGridForObject(this.target, true);
                } else {
                    G.state.worldObjects = G.state.worldObjects.filter(o => o !== this.target);
                }
                this.resetTask();
                break;
            case 'pickingUpResource':
                this.payload = { ...this.target.resource };
                G.state.worldObjects = G.state.worldObjects.filter(o => o !== this.target);
                const stockpile = findClosest(this, G.state.buildings, b => b.type === 'stockpile');
                if (!stockpile || !this.findAndSetPath(stockpile, 'depositingResource')) {
                    const droppedPileType = this.payload.type + '_pile';
                    if (PixelDrawer[droppedPileType]) G.state.worldObjects.push(new WorldObject(droppedPileType, this.x, this.y));
                    this.resetTask();
                }
                break; 
            case 'workingHunting':
                if (this.target && !this.target.isDead) G.state.projectiles.push(new Projectile(this.x, this.y, this.target));
                this.resetTask();
                break;
            case 'workingOnConstruction':
                this.target.isUnderConstruction = false;
                if (this.target.type === 'hut') assignHomes();
                this.resetTask();
                break;
            case 'upgradingBuilding':
                const upgradeInfo = CONFIG.UPGRADES[this.target.type];
                if (upgradeInfo) {
                    this.target.type = upgradeInfo.to;
                    this.target.isUpgrading = false;
                    this.target.isUnderConstruction = false;
                    this.target.size = CONFIG.BUILDINGS[upgradeInfo.to].size;
                    this.target.cost = CONFIG.BUILDINGS[upgradeInfo.to].cost;
                    this.target.upgradable = CONFIG.BUILDINGS[upgradeInfo.to].upgradable;
                    assignHomes();
                }
                this.resetTask();
                break;
            case 'workingOnFarm':
                if (this.target.farmState === 'fallow') {
                    this.target.farmState = 'growing';
                } else if (this.target.farmState === 'harvestable') {
                    const foodPile = new WorldObject('food_pile', this.target.x + (Math.random() - 0.5) * 20, this.target.y + (Math.random() - 0.5) * 20);
                    foodPile.resource.amount = CONFIG.FARM_YIELD;
                    G.state.worldObjects.push(foodPile);
                    this.target.farmState = 'fallow'; this.target.growth = 0;
                }
                this.resetTask();
                break;
            case 'workingAsForester':
                const gridPos = worldToGrid(this.x, this.y);
                if (G.state.grid[gridPos.y]?.[gridPos.x]?.walkable) {
                    const newSapling = new WorldObject('sapling', this.x, this.y);
                    G.state.worldObjects.push(newSapling);
                    updateGridForObject(newSapling, false);
                }
                this.resetTask();
                break;
        }
    }

    findAndSetPath(target, onComplete) {
        if (!target) return false;

        const start = worldToGrid(this.x, this.y);
        const end = findWalkableNeighbor(worldToGrid(target.x, target.y), start);

        if (!end) return false; 

        const path = findPath(start, end);

        const isInRange = Math.hypot(this.x - target.x, this.y - target.y) <= 
                          ((target.size ? Math.max(target.size.w, target.size.h) / 2 : target.radius || 0) + CONFIG.INTERACTION_DISTANCE);

        if (!path && !isInRange) {
            return false; 
        }

        this.resetTask(); 

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
        
        if (onComplete !== 'pickupForHauling') {
            if (target.targetedBy !== this) target.targetedBy = this;
        }
        
        return true;
    }
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
    getTooltip() {
        if (this.type === 'stump') return 'Pařez';
        if (this.resource) return `${this.type.replace('_', ' ')} (${this.resource.amount} ${this.resource.type})`;
        return `${this.type.charAt(0).toUpperCase() + this.type.slice(1)}`;
    }
    draw() { PixelDrawer.draw(G.ctx, this); }
    update() { 
        if (this.type === 'stump' && this.growth < 100) this.growth += 0.01; 
        if (this.type === 'sapling' && this.growth < 100) this.growth += 0.05;
        if(this.growth >= 100) {
            this.type = 'tree'; this.growth = 0; this.resource = { type: 'wood', amount: 5 };
            updateGridForObject(this, false);
        }
    }
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
        if (this.isUnderConstruction) {
            const needed = Object.entries(this.cost).map(([res, val]) => `${getUiIcon(res)}: ${Math.floor(this.delivered[res])}/${val}`).join(', ');
            return `${name} (Stavba) - ${needed || 'Připraveno'} [Pravý klik pro zrušení]`;
        }
        if (this.isUpgrading) {
            const needed = Object.entries(this.cost).map(([res, val]) => `${getUiIcon(res)}: ${Math.floor(this.delivered[res])}/${val}`).join(', ');
            return `${name} (Vylepšování) - ${needed || 'Připraveno'} [Pravý klik pro zrušení]`;
        }
        if (this.type === 'farm') return `${name} - ${this.farmState} (${Math.floor(this.growth * 100)}%)`;
        if (this.type === 'hut' || this.type === 'stone_house') return `${name} (Obyvatelé: ${this.residents.length}/${CONFIG.BUILDINGS[this.type].housing})`;
        return name;
    }
    hasMaterials() { return Object.keys(this.cost).every(res => this.delivered[res] >= this.cost[res]); }
    draw() {
        if (this.isUnderConstruction || this.isUpgrading) {
            G.ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
            G.ctx.fillRect(this.x - this.size.w / 2, this.y - this.size.h / 2, this.size.w, this.size.h);
            G.ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
            G.ctx.strokeRect(this.x - this.size.w / 2, this.y - this.size.h / 2, this.size.w, this.size.h);
        } else { PixelDrawer.draw(G.ctx, this); }
    }
    update(deltaTime) {
        if (this.type === 'farm' && this.farmState === 'growing' && this.growth < 1) {
            const isFarmerPresent = G.state.settlers.some(s => s.job === 'farmer' && Math.hypot(s.x - this.x, s.y - this.y) < this.size.w);
            const boost = isFarmerPresent ? CONFIG.FARM_BOOST : 1;
            this.growth += (deltaTime / (CONFIG.DAY_LENGTH_MS * CONFIG.FARM_GROWTH_DAYS)) * boost;
            if (this.growth >= 1) { this.growth = 1; this.farmState = 'harvestable'; }
        }
        if (this.reproductionCooldown > 0) {
             this.reproductionCooldown -= deltaTime / CONFIG.DAY_LENGTH_MS;
        }
    }
}

export class Animal extends Entity {
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
        else PixelDrawer.draw(G.c
