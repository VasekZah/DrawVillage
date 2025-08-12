import { G } from './globals.js';
import { CONFIG } from './config.js';
import { PixelDrawer } from './drawing.js';
import { findPath } from './pathfinding.js';
import { findClosest, worldToGrid, findWalkableNeighbor, updateGridForObject, setNotification, assignHomes, getUiIcon } from './helpers.js';

class Entity { /* ... */ }

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
        if (this.isChild) return;

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
        if (this.payload) {
            if (this.onPathComplete === 'depositingAtSite' && this.secondaryTarget) {
                 this.secondaryTarget.enRoute[this.payload.type] = Math.max(0, (this.secondaryTarget.enRoute[this.payload.type] || 0) - this.payload.amount);
                 G.state.resources[this.payload.type] += this.payload.amount;
            } else {
                const pileType = this.payload.type + '_pile';
                if (PixelDrawer[pileType]) {
                    G.state.worldObjects.push(new WorldObject(pileType, this.x, this.y, this.payload.amount));
                } else { 
                    G.state.resources[this.payload.type] += this.payload.amount;
                }
            }
        }

        if (this.target && this.target.targetedBy === this) this.target.targetedBy = null;
        if (this.target && Array.isArray(this.target.targetedByHaulers)) {
            this.target.targetedByHaulers = this.target.targetedByHaulers.filter(s => s !== this);
        }
        if (this.secondaryTarget && Array.isArray(this.secondaryTarget.targetedByHaulers)) {
             this.secondaryTarget.targetedByHaulers = this.secondaryTarget.targetedByHaulers.filter(s => s !== this);
        }

        this.task = 'idle'; this.target = null; this.secondaryTarget = null;
        this.payload = null; this.path = []; this.workProgress = 0; this.onPathComplete = 'idle';
    }
    die() {
        setNotification(`${this.name} zemřel hlady!`);
        if (this.home) this.home.residents = this.home.residents.filter(r => r !== this);
        this.resetTask();
        G.state.settlers = G.state.settlers.filter(s => s !== this);
    }
    moveAlongPath(deltaTime) {
        if (!this.path || this.path.length === 0) {
            this.task = this.onPathComplete;
            this.workProgress = 0;
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
            const stockpile = findClosest(this, G.state.buildings, b => b.type === 'stockpile' && !b.isUnderConstruction);
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
        const wanderTarget = this.home || findClosest(this, G.state.buildings, b => b.type === 'stockpile' && !b.isUnderConstruction);
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

        const stockpile = findClosest(this, G.state.buildings, b => b.type === 'stockpile' && !b.isUnderConstruction);
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
    findJobSpecificWork() {
        const stockpile = findClosest(this, G.state.buildings, b => b.type === 'stockpile' && !b.isUnderConstruction);
        if (!stockpile && this.job !== 'hunter' && this.job !== 'forager' && this.job !== 'forester') return false;

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
                    if (this.findAndSetPath(resource, 'workingAtResource')) {
                        return true;
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
                    const gridPos = worldToGrid(randomX, randomY);

                    if (G.state.grid[gridPos.y]?.[gridPos.x]?.walkable) {
                         const targetPos = {x: gridPos.x * CONFIG.GRID_SIZE, y: gridPos.y * CONFIG.GRID_SIZE, type: 'plantingsite', radius: 1};
                         if (this.findAndSetPath(targetPos, 'workingAsForester')) return true;
                    }
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
        const stockpile = findClosest(this, G.state.buildings, b => b.type === 'stockpile' && !b.isUnderConstruction);
        if (!stockpile) return false;

        const resourcePiles = G.state.worldObjects.filter(o => 
            (o.type === 'wood_pile' || o.type === 'stone_pile' || o.type === 'carcass' || o.type === 'food_pile') && !o.targetedBy
        ).sort((a, b) => Math.hypot(this.x - a.x, this.y - a.y) - Math.hypot(this.x - b.x, this.y - b.y));

        for (const pile of resourcePiles) {
            if (this.findAndSetPath(pile, 'pickingUpResource')) {
                return true;
            }
        }
        return false;
    }
    performHaulPickup() {
        const site = this.secondaryTarget;
        if (!site || !G.state.buildings.includes(site)) { this.resetTask(); return; }
        
        const neededResource = Object.keys(site.cost).find(res => site.delivered[res] + (site.enRoute[res] || 0) < site.cost[res]);
        
        if (neededResource && G.state.resources[neededResource] > 0) {
            const amountStillNeeded = site.cost[neededResource] - site.delivered[neededResource] - (site.enRoute[neededResource] || 0);
            const amountToCarry = Math.min(CONFIG.CARRY_CAPACITY, G.state.resources[neededResource], amountStillNeeded);
            
            if (amountToCarry > 0) {
                G.state.resources[neededResource] -= amountToCarry;
                site.enRoute[neededResource] = (site.enRoute[neededResource] || 0) + amountToCarry;
                this.payload = { type: neededResource, amount: amountToCarry };

                if (!this.findAndSetPath(site, 'depositingAtSite')) {
                    this.resetTask();
                }
            } else { this.resetTask(); }
        } else { this.resetTask(); }
    }
    
    performDeposit(atSite) {
        if (atSite) {
            if (this.payload && this.target) {
                this.target.delivered[this.payload.type] = (this.target.delivered[this.payload.type] || 0) + this.payload.amount;
                this.target.enRoute[this.payload.type] = Math.max(0, (this.target.enRoute[this.payload.type] || 0) - this.payload.amount);
            }
        } else {
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
    work() {
        const duration = this.task === 'pickingUpResource' ? CONFIG.PICKUP_DURATION : CONFIG.WORK_DURATION;
        if (!this.target) { this.resetTask(); return; }
        
        if (this.task === 'pickingUpResource' && !G.state.worldObjects.includes(this.target)) { this.resetTask(); return; }
        if ((this.task === 'workingAtResource') && (!this.target.resource || this.target.type === 'stump')) { this.resetTask(); return; }
        if ((this.task === 'workingOnConstruction' || this.task === 'upgradingBuilding') && !this.target.isUnderConstruction && !this.target.isUpgrading) { this.resetTask(); return; }

        this.workProgress++;
        if (this.workProgress >= duration) this.finishWork();
    }
    finishWork() {
        if (!this.target) { this.resetTask(); return; }
        const isWorldObjectTask = this.task === 'workingAtResource' || this.task === 'pickingUpResource';
        if (isWorldObjectTask && !G.state.worldObjects.includes(this.target)) {
            this.resetTask();
            return;
        }

        switch(this.task) {
            case 'workingAtResource':
                if (this.target.type === 'stump' || !this.target.resource) { this.resetTask(); return; }
                
                this.payload = { ...this.target.resource };
                
                if (this.target.type === 'tree') {
                    this.target.type = 'stump'; this.target.growth = 0; this.target.resource = null;
                    updateGridForObject(this.target, true);
                } else if (this.target.type === 'bush') {
                    G.state.worldObjects = G.state.worldObjects.filter(o => o !== this.target);
                    updateGridForObject(this.target, true);
                } else {
                    G.state.worldObjects = G.state.worldObjects.filter(o => o !== this.target);
                    updateGridForObject(this.target, true);
                }

                const stockpile = findClosest(this, G.state.buildings, b => b.type === 'stockpile' && !b.isUnderConstruction);
                if (!stockpile || !this.findAndSetPath(stockpile, 'depositingResource')) {
                    this.resetTask();
                }
                return;
            case 'pickingUpResource':
                this.payload = { ...this.target.resource };
                G.state.worldObjects = G.state.worldObjects.filter(o => o !== this.target);
                const stockpilePick = findClosest(this, G.state.buildings, b => b.type === 'stockpile' && !b.isUnderConstruction);
                if (!stockpilePick || !this.findAndSetPath(stockpilePick, 'depositingResource')) {
                    this.resetTask();
                }
                break; 
            case 'workingHunting':
                if (this.target && !this.target.isDead) G.state.projectiles.push(new Projectile(this.x, this.y, this.target));
                this.resetTask();
                break;
            case 'workingOnConstruction':
                this.target.isUnderConstruction = false;
                assignHomes();
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
                    const foodPile = new WorldObject('food_pile', this.target.x + (Math.random() - 0.5) * 20, this.target.y + (Math.random() - 0.5) * 20, CONFIG.FARM_YIELD);
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
// ...
