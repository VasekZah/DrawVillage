import { G } from './globals.js';
import { CONFIG } from './config.js';
import { createResourcePile, removeEntity, setNotification, findClosestEntity, updateGridForObject, calculateAccessPoints, addEntity, worldToGrid } from './helpers.js';
import { WorldObject } from './classes.js';

export const TaskActions = {
    // ... (eat, haul_to_site, haul_resource_pile, build zůstávají stejné)

    gather_wood: (settler, task) => {
        const tree = task.target;
        if (!tree || tree.amount <= 0 || !G.state.entities.some(e => e.id === tree.id)) {
            task.status = 'failed';
            settler.finishTask(true);
            return;
        }

        if (!settler.isMoving) {
            task.workTimer += 16;
            if (task.workTimer >= 3000) {
                createResourcePile('wood', tree.x, tree.y, 5); // Změněno na 5
                removeEntity(tree);
                task.status = 'complete';
                settler.finishTask(false, true);
            }
        }
    },
    gather_stone: (settler, task) => {
        const stone = task.target;
        if (!stone || stone.amount <= 0 || !G.state.entities.some(e => e.id === stone.id)) {
            task.status = 'failed';
            settler.finishTask(true);
            return;
        }

        if (!settler.isMoving) {
            task.workTimer += 16;
            if (task.workTimer >= 4000) {
                const gatheredAmount = Math.min(5, stone.amount); // Změněno na 5
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
         if (!bush || bush.amount <= 0 || !G.state.entities.some(e => e.id === bush.id)) {
            task.status = 'failed';
            settler.finishTask(true);
            return;
        }

        if (!settler.isMoving) {
            task.workTimer += 16;
            if (task.workTimer >= 2000) {
                const gatheredAmount = Math.min(5, bush.amount); // Změněno na 5
                bush.amount -= gatheredAmount;
                G.state.resources.food += gatheredAmount;
                if (bush.amount <= 0) removeEntity(bush); // V budoucnu by mohl dorůst
                task.status = 'complete';
                settler.finishTask(false, true);
            }
        }
    },

    // ... (zbytek souboru zůstává stejný)
};
