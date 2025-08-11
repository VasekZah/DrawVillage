import { G } from './globals.js';
import { CONFIG } from './config.js';

export function findPath(start, end) {
    const { grid } = G.state;
    if (!start || !end || !grid[start.y]?.[start.x] || !grid[end.y]?.[end.x] || !grid[end.y][end.x].walkable) return null;
    
    const openSet = new Set();
    const closedSet = new Set();
    
    const startNode = grid[start.y][start.x];
    const endNode = grid[end.y][end.x];

    for(let y = 0; y < grid.length; y++) {
        for(let x = 0; x < grid[y].length; x++) {
            const node = grid[y][x];
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
    const { grid } = G.state;
    const neighbors = [];
    const { x, y } = node;
    const gridW = CONFIG.WORLD_WIDTH / CONFIG.GRID_SIZE;
    const gridH = CONFIG.WORLD_HEIGHT / CONFIG.GRID_SIZE;

    if (x > 0) neighbors.push(grid[y][x - 1]);
    if (x < gridW - 1) neighbors.push(grid[y][x + 1]);
    if (y > 0) neighbors.push(grid[y - 1][x]);
    if (y < gridH - 1) neighbors.push(grid[y + 1][x]);
    return neighbors;
}
