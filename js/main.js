// main.js
// Vstupní bod aplikace (gridový pathfinding demo).
// – plátno s mřížkou
// – myší stavíš zdi (drag), SHIFT = start, ALT = end
// – tlačítka: Clear, Random, Recalc
// – renderer běží 1× (mapRenderer.js má pojistku proti dvojímu loopu)

(function () {
    const TILE_SIZE = 24;

    const state = {
        tileSize: TILE_SIZE,
        cols: 0,
        rows: 0,
        tiles: [],
        start: null,
        end: null,
        path: null
    };

    let canvas;
    let controlsBar;

    document.addEventListener("DOMContentLoaded", () => {
        canvas = document.getElementById("canvas");

        // Inicializace velikosti plátna a gridu
        resizeCanvas();
        createOrResizeGrid();

        // Inicializace rendereru (spustí 1× smyčku)
        initRenderer(canvas, state);

        // Vstupy myší (ze souboru input.js)
        setupInputHandlers(canvas, state);

        // Reakce na změny (po puštění myši a při nastavení start/end)
        canvas.addEventListener("mouseup", recomputePath);
        canvas.addEventListener("mousedown", (e) => {
            // když mousedown se SHIFT/ALT změní start/end, pošleme přepočet
            if (e.shiftKey || e.altKey) {
                setTimeout(recomputePath, 0);
            }
        });

        // Ovládací panel
        buildControls();

        // Reakce na resize okna
        window.addEventListener("resize", () => {
            resizeCanvas();
            createOrResizeGrid();
            clampStartEnd();
            recomputePath();
        });
    });

    // ─────────────────────────────────────────────────────────────
    // UI: Ovládací panel
    // ─────────────────────────────────────────────────────────────
    function buildControls() {
        // Pokud už existuje (hot reload), znovu nevytvářet
        if (controlsBar && controlsBar.isConnected) return;

        controlsBar = createElement("div", ["controls-bar"]);
        setStyles(controlsBar, {
            position: "absolute",
            left: "10px",
            top: "70px",
            display: "flex",
            gap: "8px",
            background: "rgba(0,0,0,0.4)",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid rgba(255,255,255,0.1)",
            zIndex: 10
        });

        const btnClear = createButton("Clear", () => {
            clearWalls();
            state.path = null;
        });

        const btnRandom = createButton("Random", () => {
            randomizeWalls(0.22);
            recomputePath();
        });

        const btnRecalc = createButton("Recalc", () => {
            recomputePath();
        });

        const legend = createElement("div", [], `
            <small>
                <b>Tipy:</b> Drag = zdi, <b>Shift+Click</b> = Start, <b>Alt+Click</b> = End
            </small>
        `);
        setStyles(legend, { alignSelf: "center", opacity: "0.85" });

        appendChildren(controlsBar, [btnClear, btnRandom, btnRecalc, legend]);
        document.body.appendChild(controlsBar);
    }

    // ─────────────────────────────────────────────────────────────
    // Canvas a grid
    // ─────────────────────────────────────────────────────────────
    function resizeCanvas() {
        // Vyplní dostupnou výšku main, jak je ve style.css
        // Klientská velikost:
        const rect = canvas.getBoundingClientRect();
        // Pokud je canvas čerstvě vložený, rect může být 0; použijeme fallback na rodiče
        const parent = canvas.parentElement || document.body;

        const width = Math.max(300, parent.clientWidth - 32);  // lehký vnitřní okraj
        const height = Math.max(200, parent.clientHeight - 32);

        canvas.width = Math.floor(width);
        canvas.height = Math.floor(height);
    }

    function createOrResizeGrid() {
        const cols = Math.floor(canvas.width / state.tileSize);
        const rows = Math.floor(canvas.height / state.tileSize);

        if (cols === state.cols && rows === state.rows && state.tiles.length) {
            return; // velikost beze změny
        }

        const newTiles = createGrid(cols, rows);

        // Pokud existovaly staré tiles, zkusíme je přenést (aby resize nesmazal vše)
        if (state.tiles.length) {
            const minRows = Math.min(rows, state.rows);
            const minCols = Math.min(cols, state.cols);
            for (let r = 0; r < minRows; r++) {
                for (let c = 0; c < minCols; c++) {
                    newTiles[r][c].isWall = state.tiles[r][c].isWall;
                }
            }
        }

        state.cols = cols;
        state.rows = rows;
        state.tiles = newTiles;

        // start/end mohou být mimo, pokud se grid zmenšil
        clampStartEnd();
    }

    function createGrid(cols, rows) {
        const tiles = new Array(rows);
        for (let r = 0; r < rows; r++) {
            tiles[r] = new Array(cols);
            for (let c = 0; c < cols; c++) {
                tiles[r][c] = { isWall: false };
            }
        }
        return tiles;
    }

    function clampStartEnd() {
        if (state.start) {
            state.start.col = Math.max(0, Math.min(state.cols - 1, state.start.col));
            state.start.row = Math.max(0, Math.min(state.rows - 1, state.start.row));
        }
        if (state.end) {
            state.end.col = Math.max(0, Math.min(state.cols - 1, state.end.col));
            state.end.row = Math.max(0, Math.min(state.rows - 1, state.end.row));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Akce: mazání / random / přepočet cesty
    // ─────────────────────────────────────────────────────────────
    function clearWalls() {
        for (let r = 0; r < state.rows; r++) {
            for (let c = 0; c < state.cols; c++) {
                state.tiles[r][c].isWall = false;
            }
        }
    }

    function randomizeWalls(prob = 0.2) {
        for (let r = 0; r < state.rows; r++) {
            for (let c = 0; c < state.cols; c++) {
                // necháme okraj volný, ať se snáz hledá cesta
                const onBorder = r === 0 || c === 0 || r === state.rows - 1 || c === state.cols - 1;
                state.tiles[r][c].isWall = !onBorder && Math.random() < prob;
            }
        }
        // udrž start/end průchodné
        if (state.start) state.tiles[state.start.row][state.start.col].isWall = false;
        if (state.end) state.tiles[state.end.row][state.end.col].isWall = false;
    }

    function recomputePath() {
        if (state.start && state.end) {
            state.path = findPath(state.tiles, state.start, state.end);
        } else {
            state.path = null;
        }
    }
})();
