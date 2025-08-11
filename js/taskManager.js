import { G } from './globals.js';
import { CONFIG } from './config.js';
import { Task } from './classes.js';
import { isTargeted, worldToGrid } from './helpers.js';

// --- TASK MANAGER ---
export function manageTasks() {
    G.state.tasks = G.state.tasks.filter(t => t.status !== 'complete' && t.status !== 'failed');

    G.state.buildings.forEach(b => {
        if (b.isUnderConstruction()) {
            if (!b.hasMaterials()) {
                Object.entries(b.cost).forEach(([res, needed]) => {
                    const delivered = b.delivered[res];
                    const haulingTasks = G.state.tasks.filter(t => t.type === 'haul_to_site' && t.originalTarget?.id === b.id && t.options.resource === res).length;
                    if (delivered < needed && haulingTasks === 0) {
                        G.state.tasks.push(new Task('haul_to_site', b, { resource: res }));
                    }
                });
            } else if (b.status === 'blueprint' && !isTargeted(b, 'build')) {
                G.state.tasks.push(new Task('build', b));
            }
        }
    });

    const manageGatherTasks = (resourceType, taskType, job) => {
        const idleWorkers = G.state.settlers.filter(s => s.job === job && !s.task).length;
        if (idleWorkers === 0) return;

        const pendingTasks = G.state.tasks.filter(t => t.type === taskType && t.status === 'pending').length;
        const neededTasks = idleWorkers - pendingTasks;
        if (neededTasks <= 0) return;

        const availableResources = G.state.worldObjects.filter(o => o.type === resourceType && !isTargeted(o));

        const center = G.state.buildings.find(b => b.type === 'stockpile') || {x: CONFIG.WORLD_SIZE / 2, y: CONFIG.WORLD_SIZE / 2};
        availableResources.sort((a, b) => Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y));

        for (let i = 0; i < Math.min(neededTasks, availableResources.length); i++) {
            G.state.tasks.push(new Task(taskType, availableResources[i]));
        }
    };

    manageGatherTasks('tree', 'gather_wood', 'lumberjack');
    manageGatherTasks('stone', 'gather_stone', 'miner');
    manageGatherTasks('berryBush', 'gather_berries', 'gatherer');

    const idleHaulers = G.state.settlers.filter(s => s.job === 'unemployed' && !s.task).length;
    if (idleHaulers > 0) {
        const availablePiles = G.state.worldObjects.filter(o => o.type === 'resource_pile' && !isTargeted(o, 'haul_resource_pile'));
        for (let i = 0; i < Math.min(idleHaulers, availablePiles.length); i++) {
            if (!G.state.tasks.some(t => t.target.id === availablePiles[i].id)) {
                G.state.tasks.push(new Task('haul_resource_pile', availablePiles[i]));
            }
        }
    }

    G.state.buildings.forEach(b => {
        if (b.status !== 'operational' || isTargeted(b)) return;

        if (b.type === 'farm') {
            if (b.farmState === 'empty') G.state.tasks.push(new Task('plant_farm', b));
            else if (b.farmState === 'growing') G.state.tasks.push(new Task('tend_farm', b));
            else if (b.farmState === 'ready') G.state.tasks.push(new Task('harvest_farm', b));
        }
        if (b.type === 'mine' && !isTargeted(b, 'work_at_building')) {
            G.state.tasks.push(new Task('work_at_building', b));
        }
        if (b.type === 'foresterLodge' && !isTargeted(b, 'plant_tree')) {
            const treesNearby = G.state.worldObjects.filter(o => (o.type === 'tree' || o.type === 'sapling') && Math.hypot(o.x - b.x, o.y - b.y) < CONFIG.FORESTER_LODGE_RADIUS).length;
            if (treesNearby < CONFIG.FORESTER_TREE_DENSITY_TARGET) {
                const angle = Math.random() * 2 * Math.PI; const radius = Math.random() * CONFIG.FORESTER_LODGE_RADIUS;
                const x = b.x + Math.cos(angle) * radius; const y = b.y + Math.sin(angle) * radius;
                if(worldToGrid(x, y)?.walkable && !isTargeted({x,y}, 'plant_tree')) {
                    G.state.tasks.push(new Task('plant_tree', {x, y, lodge: b}));
                }
            }
        }
    });
}
