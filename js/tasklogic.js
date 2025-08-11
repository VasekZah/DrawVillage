import { state, CONFIG } from './config.js';
import { createResourcePile, removeEntity, setNotification, findClosestEntity, updateGridForObject, calculateAccessPoints, addEntity, worldToGrid } from './helpers.js';
import { WorldObject } from './classes.js';

// --- TASK LOGIC ---
export const TaskActions = {
    eat: (settler, task) => {
        if (state.resources.food > 0) {
            const amountToEat = Math.min(state.resources.food, 10);
            state.resources.food -= amountToEat;
            settler.hunger = Math.max(0, settler.hunger - (amountToEat * 5));
        }
        task.status = 'complete';
        settler.finishTask(false, true);
    },
    haul_to_site: (settler, task) => {
        const site = task.originalTarget || task.target;
        const resource = task.options.resource;

        if (!site || site.status === 'operational') {
            task.status = 'failed';
            settler.finishTask(true);
            return;
        }

        if (task.stage === 'initial') {
            const stockpile = findClosestEntity(settler, e => e.type === 'stockpile' && e.status === 'operational');
            if (stockpile && state.resources[resource] > 0) {
                task.stage = 'going_to_stockpile'; task.originalTarget = site; task.target = stockpile;
                settler.recalculatePath();
            } else { task.status = 'failed'; settler.finishTask(true); }
        } else if (task.stage === 'going_to_stockpile') {
            const needed = site.cost[resource] - site.delivered[resource];
            const amountToTake = Math.min(CONFIG.CARRY_CAPACITY, state.resources[resource], needed);
            if (amountToTake > 0) {
                state.resources[resource] -= amountToTake;
                task.payload = { type: resource, amount: amountToTake };
                task.stage = 'going_to_site'; task.target = task.originalTarget;
                settler.recalculatePath();
            } else { task.status = 'complete'; settler.finishTask(false, true); }
        } else if (task.stage === 'going_to_site') {
            if (task.payload) { site.delivered[task.payload.type] += task.payload.amount; task.payload = null; }
            task.status = 'complete';
            settler.finishTask(false, true);
        }
    },
    haul_resource_pile: (settler, task) => {
        const pile = task.target;
        const stockpile = findClosestEntity(pile, e => e.type === 'stockpile' && e.status === 'operational');
        if (!pile || pile.amount <= 0 || !stockpile) {
            task.status = 'failed';
            if(pile && pile.amount <= 0) removeEntity(pile);
            settler.finishTask(true);
            return;
        }

        if (task.stage === 'initial') {
            task.stage = 'going_to_pile';
            settler.recalculatePath();
        } else if (task.stage === 'going_to_pile') {
            const amountToTake = Math.min(CONFIG.CARRY_CAPACITY, pile.amount);
            pile.amount -= amountToTake;
            task.payload = { type: pile.resourceType, amount: amountToTake };
            if (pile.amount <= 0) removeEntity(pile);

            task.stage = 'going_to_stockpile';
            task.target = stockpile;
            settler.recalculatePath();
        } else if (task.stage === 'going_to_stockpile') {
            if (task.payload) {
                state.resources[task.payload.type] += task.payload.amount;
                task.payload = null;
            }
            task.status = 'complete';
            settler.finishTask(false, true);
        }
    },
    build: (settler, task) => {
        const site = task.target;
        if (!site || !site.hasMaterials() || site.status === 'operational') {
            task.status = 'failed';
            settler.finishTask(true);
            return;
        }

        if (site.status === 'blueprint') {
            site.status = 'constructing';
            updateGridForObject(site, true);
            calculateAccessPoints(site);
        }

        if (!settler.isMoving) {
            task.workTimer += 16;
            if (task.workTimer >= 1000) {
                site.buildProgress += 10;
                task.workTimer = 0;

                if (site.buildProgress >= 100) {
                    site.buildProgress = 100;
                    site.status = 'operational';
                    calculateAccessPoints(site);
                    setNotification(`${CONFIG.BUILDING_INFO[site.type].name} completed!`);
                    task.status = 'complete';
                    settler.finishTask();
                }
            }
        }
    },
    gather_wood: (settler, task) => {
        const tree = task.target;
        if (!tree || tree.amount <= 0 || !state.entities.some(e => e.id === tree.id)) {
            task.status = 'failed';
            settler.finishTask(true);
            return;
        }

        if (!settler.isMoving) {
            task.workTimer += 16;
            if (task.workTimer >= 3000) {
                createResourcePile('wood', tree.x, tree.y, 5);
                removeEntity(tree);
                task.status = 'complete';
                settler.finishTask(false, true);
            }
        }
    },
    gather_stone: (settler, task) => {
        const stone = task.target;
        if (!stone || stone.amount <= 0 || !state.entities.some(e => e.id === stone.id)) {
            task.status = 'failed';
            settler.finishTask(true);
            return;
        }

        if (!settler.isMoving) {
            task.workTimer += 16;
            if (task.workTimer >= 4000) {
                const gatheredAmount = Math.min(10, stone.amount);
                stone.amount -= gatheredAmount;
                createResourcePile('stone', stone.x, stone.y, gatheredAmount);
                if (stone.amount <= 0) removeEntity(stone);
                task.status = 'complete';
                settler.finishTask(false, true);
            }
        }
    },
    gather_berries: (settler, task) => {
        const bush = task.target;
         if (!bush || bush.amount <= 0 || !state.entities.some(e => e.id === bush.id)) {
            task.status = 'failed';
            settler.finishTask(true);
            return;
        }

        if (!settler.isMoving) {
            task.workTimer += 16;
            if (task.workTimer >= 2000) {
                const gatheredAmount = Math.min(3, bush.amount);
                bush.amount -= gatheredAmount;
                state.resources.food += gatheredAmount;
                if (bush.amount <= 0) removeEntity(bush);
                task.status = 'complete';
                settler.finishTask(false, true);
            }
        }
    },
    plant_farm: (settler, task) => {
        task.target.farmState = 'growing';
        task.target.growth = 0;
        task.status = 'complete';
        settler.finishTask(false, true);
    },
    harvest_farm: (settler, task) => {
        createResourcePile('food', task.target.x, task.target.y, 15);
        task.target.farmState = 'empty';
        task.target.growth = 0;
        task.status = 'complete';
        settler.finishTask(false, true);
    },
    tend_farm: (settler, task) => {
        task.target.tended = true;
        task.status = 'complete';
        settler.finishTask(false, true);
    },
    work_at_building: (settler, task) => {
        const building = task.target;
        if (building.type === 'mine') {
            if (!settler.isMoving) {
                task.workTimer += 16;
                if (task.workTimer >= 8000) {
                    state.resources.stone++;
                    task.workTimer = 0;
                }
            }
        }
    },
    plant_tree: (settler, task) => {
        addEntity(new WorldObject('sapling', task.target.x, task.target.y));
        task.status = 'complete';
        settler.finishTask(false, true);
    },
    wander: (settler, task) => {
        if (task.stage === 'initial') {
            let center = {x: CONFIG.WORLD_SIZE / 2, y: CONFIG.WORLD_SIZE / 2};
            const home = state.buildings.find(b => b.id === settler.homeId);
            if (home) {
                center = home;
            } else {
                const stockpile = findClosestEntity(settler, e => e.type === 'stockpile');
                if (stockpile) center = stockpile;
            }

            let targetPos = null;
            let attempts = 0;
            while (!targetPos && attempts < 20) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = 20 + Math.random() * 80;
                const candidatePos = {
                    x: center.x + Math.cos(angle) * radius,
                    y: center.y + Math.sin(angle) * radius
                };
                const gridNode = worldToGrid(candidatePos.x, candidatePos.y);
                if (gridNode && gridNode.walkable) {
                    targetPos = candidatePos;
                }
                attempts++;
            }

            if (targetPos) {
                task.target = targetPos;
                task.stage = 'wandering';
                settler.recalculatePath();
            } else {
                task.status = 'failed';
                settler.finishTask(true);
            }
        } else {
            task.status = 'complete';
            settler.finishTask(false, true);
        }
    }
};
