import { G } from './globals.js';
import { CONFIG } from './config.js';

export function worldToGrid(x, y) { 
    return { 
        x: Math.floor(x / CONFIG.GRID_SIZE), 
        y: Math.floor(y / CONFIG.GRID_SIZE) 
    }; 
}

export function screenToWorld(x, y) { 
    const { camera } = G.state;
    return { 
        x: camera.x + x / camera.zoom, 
        y: camera.y + y / camera.zoom 
    }; 
}

export function setNotification(message, duration = 3000) { 
    if (G.ui && G.ui.notificationArea) {
        G.ui.notificationArea.textContent = message;
        setTimeout(() => {
            if (G.ui.notificationArea.textContent === message) {
                G.ui.notificationArea.textContent = '';
            }
        }, duration);
    }
}

export function findClosest(entity, list, condition = () => true, maxDist = Infinity) {
    let closest = null;
    let minDist = maxDist;
    list.forEach(item => {
        if (condition(item)) {
            const dist = Math.hypot(entity.x - item.x, entity.y - item.y);
            if (dist < minDist) {
                minDist = dist;
                closest = item;
            }
        }
    });
    return closest;
}

export function updateGridForObject(obj, walkable) {
    const { grid } = G.state;
    const size = obj.size || { w: obj.radius * 2, h: obj.radius * 2 };
    const start = worldToGrid(obj.x - size.w / 2, obj.y - size.h / 2);
    const end = worldToGrid(obj.x + size.w / 2, obj.y + size.h / 2);
    for (let y = start.y; y <= end.y; y++) {
        for (let x = start.x; x <= end.x; x++) {
            if (grid[y]?.[x]) {
                grid[y][x].walkable = walkable;
            }
        }
    }
}

export function findWalkableNeighbor(gridPos, startPos) {
    if (!gridPos || !G.state.grid[gridPos.y] || !G.state.grid[gridPos.y][gridPos.x]) return null;
    
    const node = G.state.grid[gridPos.y][gridPos.x];
    if (node.walkable) return node;
    
    const queue = [node];
    const visited = new Set([`${node.x},${node.y}`]);
    
    while (queue.length > 0) {
        const current = queue.shift();
        const neighbors = getNeighborsForBFS(current);
        
        for (const neighbor of neighbors) {
            const key = `${neighbor.x},${neighbor.y}`;
            if (!visited.has(key)) {
                if (neighbor.walkable) return neighbor;
                visited.add(key);
                queue.push(neighbor);
            }
        }
    }
    return null;
}

function getNeighborsForBFS(node) {
    const { grid } = G.state;
    const neighbors = [];
    const { x, y } = node;
    const gridW = CONFIG.WORLD_WIDTH / CONFIG.GRID_SIZE;
    const gridH = CONFIG.WORLD_HEIGHT / CONFIG.GRID_SIZE;

    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dx, dy] of directions) {
        const newX = x + dx;
        const newY = y + dy;
        if (newX >= 0 && newX < gridW && newY >= 0 && newY < gridH) {
            neighbors.push(grid[newY][newX]);
        }
    }
    return neighbors;
}

export function assignHomes() {
    G.state.buildings.forEach(b => { if (b.residents) b.residents = []; });
    G.state.settlers.forEach(s => s.home = null);

    const allHuts = G.state.buildings.filter(b => (b.type === 'hut' || b.type === 'stone_house') && !b.isUnderConstruction && !b.isUpgrading);
    const unsettledAdults = G.state.settlers.filter(s => !s.isChild && !s.home);
    const unsettledChildren = G.state.settlers.filter(s => s.isChild && !s.home);

    for (const hut of allHuts) {
        const capacity = CONFIG.BUILDINGS[hut.type].housing;
        while(hut.residents.length < capacity) {
            const settler = unsettledAdults.shift();
            if (!settler) break;
            hut.residents.push(settler);
            settler.home = hut;
        }
    }
     for (const hut of allHuts) {
        const capacity = CONFIG.BUILDINGS[hut.type].housing;
        while(hut.residents.length < capacity) {
            const child = unsettledChildren.shift();
            if (!child) break;
            hut.residents.push(child);
            child.home = hut;
        }
    }
}
