import { G } from './globals.js';
import { CONFIG } from './config.js';

export function findPath(start, end) {
    const { state } = G;
    if (!start || !end || !state.grid[start.y]?.[start.x] || !state.grid[end.y]?.[end.x] || !state.grid[end.y][end.x].walkable) return null;
    
    const openSet = new Set();
    const closedSet = new Set();
    
    const startNode = state.grid[start.y][start.x];
    const endNode = state.grid[end.y][end.x];

    for(let y = 0; y < state.grid.length; y++) {
        for(let x = 0; x < state.grid[y].length; x++) {
            const node = state.grid[y][x];
            node.g = Infinity;
            node.f = Infinity;
            node.parent = null;
        }
    }
    
    startNode.g = 0;
    startNode.h = Math.hypot(start.x - end.x, start.y - end.y);
    startNode.f = startNode.h;
    openSet.add(startNode);

    while (openSet.size > 0) {
        let current = null;
        for (const node of openSet) {
            if (current === null || node.f < current.f) {
                current = node;
            }
        }

        if (current === endNode) {
            const path = [];
            let temp = current;
            while (temp) {
                path.push(temp);
                temp = temp.parent;
            }
            return path.reverse();
        }

        openSet.delete(current);
        closedSet.add(current);

        const neighbors = getNeighbors(current);
        for (const neighbor of neighbors) {
            if (closedSet.has(neighbor) || !neighbor.walkable) continue;
            
            let tempG = current.g + (1 + neighbor.wear / 255);
            if (tempG < neighbor.g) {
                neighbor.g = tempG;
                neighbor.h = Math.hypot(neighbor.x - endNode.x, neighbor.y - endNode.y);
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = current;
                if (!openSet.has(neighbor)) {
                    openSet.add(neighbor);
                }
            }
        }
    }
    return null;
}

function getNeighbors(node) {
    const { state } = G;
    const neighbors = [];
    const { x, y } = node;
    const gridW = CONFIG.WORLD_WIDTH / CONFIG.GRID_SIZE;
    const gridH = CONFIG.WORLD_HEIGHT / CONFIG.GRID_SIZE;

    if (x > 0) neighbors.push(state.grid[y][x - 1]);
    if (x < gridW - 1) neighbors.push(state.grid[y][x + 1]);
    if (y > 0) neighbors.push(state.grid[y - 1][x]);
    if (y < gridH - 1) neighbors.push(state.grid[y + 1][x]);
    return neighbors;
}
