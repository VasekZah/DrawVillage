// js/classes.js

import { G } from './globals.js';
import { CONFIG } from './config.js';
import { OutlineDrawer } from './drawing.js';
import { findClosestEntity, removeEntity, findWalkableNeighbor, worldToGrid, addEntity, setNotification, isTargeted } from './helpers.js';
import { findPath } from './pathFinding.js';
import { TaskActions } from './taskLogic.js';
import { getAssetImg } from './uiHelpers.js'; // <-- PŘIDANÝ IMPORT

// --- CORE CLASSES ---
class Entity {
    constructor(type, x, y) { this.id = G.state.nextId++; this.type = type; this.x = x; this.y = y; this.radius = 16; }
    draw() {
        // Vykreslení pomocí uživatelského assetu, pokud existuje
        const assetKey = this.type.startsWith('resource_') ? this.resourceType : this.type;
        const asset = G.state.loadedUserAssets[assetKey];
        if (asset) {
            OutlineDrawer.draw(G.ctx, this);
        } else { // Jinak fallback na placeholder
            G.ctx.save();
            G.ctx.translate(this.x, this.y);
            G.ctx.strokeStyle = '#e53e3e';
            G.ctx.lineWidth = 2;
            const r = this.radius;
            G.ctx.strokeRect(-r/2, -r/2, r, r);
            G.ctx.restore();
        }
    }
    update(deltaTime) {}
    getTooltip() { return this.type; }
}

export class Humanoid extends Entity {
    constructor(type, x, y) {
        super(type, x, y);
        this.task = null; this.path = []; this.isMoving = false;
        this.hunger = 0; this.homeId = null; this.taskCooldown = 0;
    }
    update(deltaTime) {
        if (this.taskCooldown > 0) this.taskCooldown -= deltaTime;
        this.hunger += (deltaTime / CONFIG.DAY_LENGTH_MS) * CONFIG.HUNGER_PER_DAY;
        if (this.hunger >= 100) { this.die(); return; }

        if (this.task) {
            this.executeTask(deltaTime);
        } else if (this.taskCooldown <= 0) {
            this.findTask();
        }
        this.isMoving = this.path && this.path.length > 0;
    }
    findTask() {
        if (this.hunger > 60 && (!this.task || this.task.type !== 'eat')) {
            this.findFood();
        }
    }
    findFood() {
        if (G.state.resources.food > 0) {
            const stockpile = findClosestEntity(this, e => e.type === 'stockpile' && e.status === 'operational');
            if (stockpile) {
                this.setTask(new Task('eat', stockpile));
            }
        }
    }
    executeTask(deltaTime) {
        if (this.path && this.path.length > 0) {
            if (this.moveAlongPath(deltaTime)) { // Arrived
                if (this.task) this.task.onArrival(this);
            }
        } else if (this.task) {
            this.task.onArrival(this);
        }
    }
    setTask(task) {
        if (this.task) this.finishTask();
        this.task = task;
        if (task) {
            task.assignee = this;
            task.status = 'active';
            this.recalculatePath();
        }
    }
    recalculatePath() {
        if (!this.task || !this.task.target || (this.task.target.x === undefined || this.task.target.y === undefined)) {
            this.path = [];
            return;
        }
        const startNode = worldToGrid(this.x, this.y);
        let endNode = null;

        if (this.task.target instanceof Building && this.task.target.accessPoints.length > 0) {
            let closestPoint = null;
            let minDistanceSq = Infinity;
            for (const point of this.task.target.accessPoints) {
                const pointWorldX = point.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
                const pointWorldY = point.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
                const distSq = (this.x - pointWorldX)**2 + (this.y - pointWorldY)**2;
                if (distSq < minDistanceSq) {
                    minDistanceSq = distSq;
                    closestPoint = point;
                }
            }
            endNode = closestPoint;
        } else {
            endNode = findWalkableNeighbor(worldToGrid(this.task.target.x, this.task.target.y));
        }

        if (startNode && endNode) {
            this.path = findPath(startNode, endNode);
            if (!this.path) {
                this.finishTask(true);
            }
        } else {
            this.finishTask(true);
        }
    }
    finishTask(failed = false, successCooldown = false) {
        if (failed) {
            this.taskCooldown = 1500;
            if (this.task) this.task.status = 'failed';
        } else if (successCooldown) {
            this.taskCooldown = 500;
        }

        if (this.task && this.task.assignee === this) {
            this.task.assignee = null;
        }
        this.task = null;
        this.path = [];
    }
    moveAlongPath(deltaTime) {
        if (!this.path || this.path.length === 0) return true;
        const targetNode = this.path[0];
        const targetX = targetNode.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
        const targetY = targetNode.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
        const [dx, dy] = [targetX - this.x, targetY - this.y];
        const dist = Math.hypot(dx, dy);
        const speedBonus = CONFIG.PATH_SPEED_BONUS * (targetNode.wear || 0);
        const currentSpeed = CONFIG.SETTLER_SPEED * (1 + speedBonus) * (deltaTime / 16);

        if (dist < currentSpeed) {
            this.x = targetX; this.y = targetY;
            const prevNode = this.path.shift();
            if (prevNode) prevNode.wear = Math.min(1, (prevNode.wear || 0) + CONFIG.PATH_WEAR_AMOUNT);
            return this.path.length === 0;
        } else {
            this.x += (dx / dist) * currentSpeed; this.y += (dy / dist) * currentSpeed;
        }
        return false;
    }
    die() {
        setNotification(`${this.type === 'settler' ? 'Settler' : 'Child'} died of starvation!`);
        if (this.task) {
            if (this.task.payload && G.state.resources[this.task.payload.type]) {
               G.state.resources[this.task.payload.type] += this.task.payload.amount;
            }
            this.task.status = 'failed';
        }
        this.finishTask();
        if (this.homeId) {
            const home = G.state.buildings.find(b => b.id === this.homeId);
            if (home) home.residents = home.residents.filter(id => id !== this.id);
        }
        removeEntity(this);
    }
}

export class Settler extends Humanoid {
    constructor(x, y) {
        super('settler', x, y);
        this.job = 'unemployed';
    }
    findTask() {
        if (this.task || this.taskCooldown > 0) return;
        super.findTask();
        if (this.task) return;

        if (this.job === 'unemployed') {
            const pileToHaul = findClosestEntity(this, o => o.type === 'resource_pile' && !isTargeted(o, 'haul_resource_pile'));
            if (pileToHaul) {
                this.setTask(new Task('haul_resource_pile', pileToHaul));
                return;
            }
        }

        const availableTask = G.state.tasks.find(t => t.status === 'pending' && t.isJobAllowed(this.job) && t.canBeReached(this));
        if (availableTask) {
            this.setTask(availableTask);
            return;
        }

        if (this.job === 'unemployed') {
            this.setTask(new Task('wander', null));
        }
    }
    getTooltip() {
        let tooltip = `<b>Settler</b>\nJob: ${CONFIG.JOBS[this.job]?.name || 'Unemployed'}`;
        tooltip += `\nHunger: ${Math.floor(this.hunger)}%`;
        if (this.task) {
            tooltip += `\nTask: ${this.task.description}`;
            if (this.task.payload) tooltip += `\nCarrying: ${this.task.payload.amount} ${this.task.payload.type}`;
        }
        return tooltip;
    }
}

export class Child extends Humanoid {
    constructor(x, y) {
        super('child', x, y);
        this.age = 0;
        this.radius = 10;
    }
    update(deltaTime) {
        super.update(deltaTime);
        this.age += deltaTime / CONFIG.DAY_LENGTH_MS;
        if (this.age >= CONFIG.CHILD_GROW_UP_AGE_DAYS) {
            this.growUp();
            return;
        }
    }
    findTask() {
        if (this.task) return;
        super.findTask();
        if (this.task) return;
        if (this.taskCooldown <= 0) {
            this.setTask(new Task('wander', null));
        }
    }
    growUp() {
        setNotification('A child has grown up!', 3000);
        const newSettler = new Settler(this.x, this.y);
        newSettler.homeId = this.homeId;
        if (newSettler.homeId) {
            const home = G.state.buildings.find(b => b.id === newSettler.homeId);
            if (home) {
                home.residents = home.residents.filter(id => id !== this.id);
                home.residents.push(newSettler.id);
            }
        }
        addEntity(newSettler);
        removeEntity(this);
    }
    getTooltip() {
        return `<b>Child</b>\nAge: ${this.age.toFixed(1)} / ${CONFIG.CHILD_GROW_UP_AGE_DAYS} days\nHunger: ${Math.floor(this.hunger)}%`;
    }
}

export class Building extends Entity {
    constructor(type, x, y) {
        super(type, x, y);
        const info = CONFIG.BUILDING_INFO[type];
        this.size = info.size; this.description = info.description; this.buildProgress = 0;
        this.cost = { ...CONFIG.BUILDING_COSTS[type] };
        this.delivered = Object.keys(this.cost).reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
        this.radius = Math.max(this.size.w, this.size.h) / 2;
        this.status = 'blueprint';
        this.accessPoints = [];
        if (type === 'farm') { this.farmState = 'empty'; this.growth = 0; this.tended = false; }
        if (type === 'mine') this.workProgress = 0;
        if (type === 'hut') this.residents = [];
    }
    update(deltaTime) {
        if (this.type === 'farm' && this.farmState === 'growing' && this.status === 'operational') {
            let growthRate = CONFIG.FARM_GROWTH_RATE;
            if (this.tended) growthRate += CONFIG.FARM_TENDING_BONUS;
            this.growth += growthRate * deltaTime;
            if (this.growth >= 1) { this.farmState = 'ready'; this.growth = 1; }
            this.tended = false;
        }
    }
    isUnderConstruction() { return this.status !== 'operational'; }
    hasMaterials() { return Object.entries(this.cost).every(([res, val]) => this.delivered[res] >= val); }
    getTooltip() {
        let tooltip = `<b>${CONFIG.BUILDING_INFO[this.type].name}</b>\n${this.description}`;
        if (this.status !== 'operational') {
            tooltip += `\nStatus: ${this.status === 'blueprint' ? 'Awaiting materials' : 'Under Construction'} (${Math.floor(this.buildProgress)}%)`;
            const needed = Object.entries(this.cost).map(([res, val]) => `${getAssetImg(res, 'inline-block w-4 h-4')} ${this.delivered[res]}/${val}`).join(', ');
            tooltip += `\nMaterials: ${needed}`;
            if (this.status === 'blueprint') {
                tooltip += `\n\n<span style="color: #e53e3e;">Right-click to cancel.</span>`;
            }
        }
        if (this.type === 'farm' && this.status === 'operational') {
            const stateText = { empty: 'Empty', sown: 'Sown', growing: `Growing (${Math.floor(this.growth * 100)}%)`, ready: 'Ready to Harvest' };
            tooltip += `\nField: ${stateText[this.farmState]}`;
        }
        if (this.type === 'hut' && this.status === 'operational') {
            tooltip += `\nResidents: ${this.residents.length} / ${CONFIG.BUILDING_INFO.hut.housing}`;
        }
        return tooltip;
    }
}

export class WorldObject extends Entity {
    constructor(type, x, y, amount = 100) {
        super(type, x, y); this.amount = amount;
        if (type === 'berryBush') this.radius = 12;
        if (type === 'tree' || type === 'stone') this.radius = 14;
        if (type === 'sapling') { this.radius = 8; this.age = 0; }
        if (type.startsWith('resource_')) { this.resourceType = type.split('_')[1]; this.type = 'resource_pile'; }
    }
    update(deltaTime) {
        if (this.type === 'sapling') {
            this.age += deltaTime;
            if (this.age >= CONFIG.SAPLING_GROW_TIME_MS) {
                this.growIntoTree();
            }
        }
    }
    growIntoTree() {
        addEntity(new WorldObject('tree', this.x, this.y, 5));
        removeEntity(this);
    }
    getTooltip() {
        if (this.type === 'resource_pile') return `<b>Pile of ${CONFIG.RESOURCES_INFO[this.resourceType].name}</b>\nAmount: ${this.amount}`;
        if (this.type === 'sapling') return `<b>Sapling</b>\nGrowing...`;
        const typeName = { tree: 'Tree', stone: 'Stone Deposit', berryBush: 'Berry Bush'}[this.type] || this.type;
        return `<b>${typeName}</b>\nAmount: ${this.amount}`;
    }
}

export class Task {
    constructor(type, target, options = {}) {
        this.id = G.state.nextId++; this.type = type; this.target = target; this.options = options;
        this.assignee = null; this.status = 'pending';
        this.stage = 'initial'; this.payload = null;
        this.originalTarget = null; this.workTimer = 0;
    }
    get description() {
        switch (this.type) {
            case 'haul_to_site': return `Hauling ${this.options.resource} to construction`;
            case 'haul_resource_pile': return `Hauling ${this.target.resourceType} to stockpile`;
            case 'build': return `Constructing ${CONFIG.BUILDING_INFO[this.target.type].name}`;
            case 'eat': return `Going to eat`;
            case 'gather_wood': return `Chopping a tree`;
            case 'gather_stone': return `Mining stone`;
            case 'gather_berries': return `Gathering berries`;
            case 'plant_farm': return `Planting crops`;
            case 'harvest_farm': return `Harvesting crops`;
            case 'tend_farm': return `Tending to farm`;
            case 'plant_tree': return `Planting a tree`;
            case 'work_at_building': return `Working at ${CONFIG.BUILDING_INFO[this.target.type].name}`;
            case 'wander': return `Wandering`;
            default: return 'Working';
        }
    }
    isJobAllowed(job) {
        const jobMap = {
            build: 'builder',
            haul_to_site: ['builder', 'unemployed'],
            haul_resource_pile: 'unemployed',
            eat: true,
            gather_wood: 'lumberjack',
            gather_stone: 'miner',
            gather_berries: 'gatherer',
            plant_farm: 'farmer',
            harvest_farm: 'farmer',
            tend_farm: 'farmer',
            work_at_building: ['miner'],
            plant_tree: 'forester',
            wander: true,
        };
        const required = jobMap[this.type];
        if (required === true) return true;
        if (Array.isArray(required)) return required.includes(job);
        return required === job;
    }
    canBeReached(settler) {
        if (!this.target) return true; // Wander task etc.
        const startNode = worldToGrid(settler.x, settler.y);
        let endNode;
         if (this.target instanceof Building) {
            endNode = this.target.accessPoints[0];
         } else {
            endNode = findWalkableNeighbor(worldToGrid(this.target.x, this.target.y));
         }
        return startNode && endNode;
    }
    onArrival(settler) {
        const action = TaskActions[this.type];
        if (action) action(settler, this);
        else {
            this.status = 'failed';
            settler.finishTask(true);
        }
    }
}
