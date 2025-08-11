import { G } from './globals.js';
import { CONFIG } from './config.js';

export function worldToGrid(x, y) { 
    return { 
        x: Math.floor(x / CONFIG.GRID_SIZE), 
        y: Math.floor(y / CONFIG.GRID_SIZE) 
    }; 
}

export function screenToWorld(x, y) { 
    const { state } = G;
    return { 
        x: state.camera.x + x / state.camera.zoom, 
        y: state.camera.y + y / state.camera.zoom 
    }; 
}

export function setNotification(message, duration = 3000) { 
    G.state.notifications.message = message; 
    G.state.notifications.timer = duration; 
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
    const { state } = G;
    const size = obj.size || { w: obj.radius * 2, h: obj.radius * 2 };
    const start = worldToGrid(obj.x - size.w / 2, obj.y - size.h / 2);
    const end = worldToGrid(obj.x + size.w / 2, obj.y + size.h / 2);
    for (let y = start.y; y <= end.y; y++) {
        for (let x = start.x; x <= end.x; x++) {
            if (state.grid[y]?.[x]) {
                state.grid[y][x].walkable = walkable;
            }
        }
    }
}

export function findWalkableNeighbor(gridPos, startPos) {
    const { state } = G;
    if (!gridPos || !state.grid[gridPos.y] || !state.grid[gridPos.y][gridPos.x]) return null;
    
    const node = state.grid[gridPos.y][gridPos.x];
    if (node.walkable) return node;

    // A simple breadth-first search for the nearest walkable tile
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
    const { state } = G;
    const neighbors = [];
    const { x, y } = node;
    const gridW = CONFIG.WORLD_WIDTH / CONFIG.GRID_SIZE;
    const gridH = CONFIG.WORLD_HEIGHT / CONFIG.GRID_SIZE;

    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dx, dy] of directions) {
        const newX = x + dx;
        const newY = y + dy;
        if (newX >= 0 && newX < gridW && newY >= 0 && newY < gridH) {
            neighbors.push(state.grid[newY][newX]);
        }
    }
    return neighbors;
}
