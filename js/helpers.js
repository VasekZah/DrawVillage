import { G } from './globals.js';
import { CONFIG } from './config.js';
import { Building, Humanoid, WorldObject } from './classes.js';

// --- HELPER FUNCTIONS ---
export const worldToGrid = (x, y) => G.state.grid[Math.floor(y / CONFIG.GRID_SIZE)]?.[Math.floor(x / CONFIG.GRID_SIZE)] || null;
export const screenToWorld = (sx, sy) => ({ x: (sx - G.gameCanvas.width / 2) / G.state.camera.zoom + G.state.camera.x, y: (sy - G.gameCanvas.height / 2) / G.state.camera.zoom + G.state.camera.y });

export function findClosestEntity(source, filterFn, maxDist = Infinity) {
    let closest = null; let minDistSq = maxDist * maxDist;
    for (const entity of G.state.entities) {
        if (filterFn(entity)) {
            const distSq = (source.x - entity.x)**2 + (source.y - entity.y)**2;
            if (distSq < minDistSq) { minDistSq = distSq; closest = entity; }
        }
    }
    return closest;
}
export function findWalkableNeighbor(gridPos) {
    if (!gridPos) return null; if (gridPos.walkable) return gridPos;
    const queue = [gridPos]; const visited = new Set([`${gridPos.x},${gridPos.y}`]);
    let safety = 0;
    while (queue.length > 0 && safety < 100) {
        const current = queue.shift();
        for (const neighbor of getNeighbors(current)) {
            const key = `${neighbor.x},${neighbor.y}`;
            if (!visited.has(key)) {
                if (neighbor.walkable) return neighbor;
                visited.add(key); queue.push(neighbor);
            }
        }
        safety++;
    }
    return null;
}
export function updateGridForObject(obj, isAdding) {
    const halfW = (obj.size.w / 2); const halfH = (obj.size.h / 2);
    const startX = Math.floor((obj.x - halfW) / CONFIG.GRID_SIZE); const startY = Math.floor((obj.y - halfH) / CONFIG.GRID_SIZE);
    const endX = Math.ceil((obj.x + halfW) / CONFIG.GRID_SIZE); const endY = Math.ceil((obj.y + halfH) / CONFIG.GRID_SIZE);
    for (let y = startY; y < endY; y++) for (let x = startX; x < endX; x++) {
        if (G.state.grid[y]?.[x]) G.state.grid[y][x].walkable = !isAdding;
    }
}
export function calculateAccessPoints(building) {
    building.accessPoints = [];
    const buildingNodes = new Set();
    const halfW = (building.size.w / 2);
    const halfH = (building.size.h / 2);
    const startGridX = Math.floor((building.x - halfW) / CONFIG.GRID_SIZE);
    const startGridY = Math.floor((building.y - halfH) / CONFIG.GRID_SIZE);
    const endGridX = Math.ceil((building.x + halfW) / CONFIG.GRID_SIZE);
    const endGridY = Math.ceil((building.y + halfH) / CONFIG.GRID_SIZE);

    for (let y = startGridY; y < endGridY; y++) {
        for (let x = startGridX; x < endGridX; x++) {
            if (G.state.grid[y]?.[x]) {
                buildingNodes.add(G.state.grid[y][x]);
            }
        }
    }

    for (const bNode of buildingNodes) {
        for (const neighbor of getNeighbors(bNode)) {
            if (neighbor.walkable && !building.accessPoints.includes(neighbor)) {
                building.accessPoints.push(neighbor);
            }
        }
    }
}
export function addBuilding(building) {
    addEntity(building);
    calculateAccessPoints(building);
}
export function addEntity(entity) {
    G.state.entities.push(entity);
    if (entity instanceof Humanoid) G.state.settlers.push(entity);
    else if (entity instanceof Building) { G.state.buildings.push(entity); if (entity.status !== 'blueprint') updateGridForObject(entity, true); }
    else if (entity instanceof WorldObject) G.state.worldObjects.push(entity);
}
export function removeEntity(entity) {
    G.state.entities = G.state.entities.filter(e => e.id !== entity.id);
    if (entity instanceof Humanoid) G.state.settlers = G.state.settlers.filter(e => e.id !== entity.id);
    else if (entity instanceof Building) { G.state.buildings = G.state.buildings.filter(e => e.id !== entity.id); updateGridForObject(entity, false); }
    else if (entity instanceof WorldObject) G.state.worldObjects = G.state.worldObjects.filter(e => e.id !== entity.id);
}
export function setNotification(message, duration = 3000) {
    G.ui.notificationArea.textContent = message; G.ui.notificationArea.classList.add('show');
    setTimeout(() => G.ui.notificationArea.classList.remove('show'), duration);
}
export function createResourcePile(type, x, y, amount) {
    const nearbyPile = findClosestEntity({x,y}, e => e.type === 'resource_pile' && e.resourceType === type && !isTargeted(e), 32);
    if (nearbyPile) nearbyPile.amount += amount;
    else addEntity(new WorldObject(`resource_${type}`, x, y, amount));
}
export const isTargeted = (entity, taskType = null) => G.state.tasks.some(t => t.target?.id === entity.id && t.status !== 'pending' && (!taskType || t.type === taskType));
export function getNeighbors(node) {
    const neighbors = []; const { x, y } = node;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        if ((i === 0 && j === 0) || !G.state.grid[y + j]?.[x + i]) continue;
        neighbors.push(G.state.grid[y + j][x + i]);
    }
    return neighbors;
}
