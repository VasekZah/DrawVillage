// pathfinding.js

function findPath(grid, start, end) {
    const openSet = [];
    const closedSet = new Set();
    const startNode = createNode(start.col, start.row, null, 0, heuristic(start, end));
    openSet.push(startNode);

    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();

        if (current.col === end.col && current.row === end.row) {
            return reconstructPath(current);
        }

        closedSet.add(`${current.col},${current.row}`);

        for (const neighbor of getNeighbors(current, grid)) {
            const neighborKey = `${neighbor.col},${neighbor.row}`;
            if (closedSet.has(neighborKey) || grid[neighbor.row][neighbor.col].isWall) {
                continue;
            }

            const gScore = current.g + 1;
            let neighborNode = openSet.find(n => n.col === neighbor.col && n.row === neighbor.row);

            if (!neighborNode) {
                neighborNode = createNode(neighbor.col, neighbor.row, current, gScore, heuristic(neighbor, end));
                openSet.push(neighborNode);
            } else if (gScore < neighborNode.g) {
                neighborNode.g = gScore;
                neighborNode.f = gScore + neighborNode.h;
                neighborNode.parent = current;
            }
        }
    }

    return [];
}

function createNode(col, row, parent, g, h) {
    return { col, row, parent, g, h, f: g + h };
}

function heuristic(a, b) {
    return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

function getNeighbors(node, grid) {
    const directions = [
        { col: 1, row: 0 },
        { col: -1, row: 0 },
        { col: 0, row: 1 },
        { col: 0, row: -1 }
    ];
    const neighbors = [];

    for (const dir of directions) {
        const newCol = node.col + dir.col;
        const newRow = node.row + dir.row;
        if (grid[newRow] && grid[newRow][newCol]) {
            neighbors.push({ col: newCol, row: newRow });
        }
    }

    return neighbors;
}

function reconstructPath(node) {
    const path = [];
    let current = node;
    while (current) {
        path.push({ col: current.col, row: current.row });
        current = current.parent;
    }
    return path.reverse();
}
