// mapRenderer.js

/**
 * Jednoduchý renderer mapy pro gridový pathfinding.
 * Počítá s tím, že existují funkce:
 *  - drawGrid(ctx, cols, rows, tileSize)
 *  - drawTiles(ctx, tiles, tileSize)
 *  - drawPath(ctx, path, tileSize)
 *  - drawStartEnd(ctx, start, end, tileSize)
 *
 * Stav (gameState) očekává:
 *  - tiles: 2D pole { isWall: boolean }
 *  - cols, rows: rozměry gridu
 *  - tileSize: velikost dlaždice (px)
 *  - start: { col, row } | null
 *  - end: { col, row } | null
 *  - path: array<{ col, row }> | null
 */

(function () {
    let _ctx = null;
    let _canvas = null;
    let _state = null;
    let _loopStarted = false;

    // Volitelné: jednoduché měření FPS
    let _lastTime = performance.now();
    let _accum = 0;
    let _frames = 0;
    let _fps = 0;

    function initRenderer(canvas, gameState) {
        _canvas = canvas;
        _ctx = canvas.getContext("2d");
        _state = gameState;

        // Pojistka proti dvojímu spuštění smyčky
        if (!_loopStarted) {
            _loopStarted = true;
            requestAnimationFrame(loop);
        }
    }

    function loop(now) {
        // FPS metrika
        const dt = now - _lastTime;
        _lastTime = now;
        _accum += dt;
        _frames += 1;
        if (_accum >= 1000) {
            _fps = _frames;
            _frames = 0;
            _accum = 0;
        }

        renderFrame();
        requestAnimationFrame(loop);
    }

    function clearCanvas() {
        _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    }

    function renderFrame() {
        if (!_ctx || !_state) return;

        clearCanvas();

        const { cols, rows, tileSize, tiles, start, end, path } = _state;

        // Mřížka
        drawGrid(_ctx, cols, rows, tileSize);

        // Zdi / volné buňky
        drawTiles(_ctx, tiles, tileSize);

        // Nalezená cesta (pokud je)
        drawPath(_ctx, path, tileSize);

        // Start / End
        drawStartEnd(_ctx, start, end, tileSize);

        // FPS (volitelné)
        _ctx.fillStyle = "rgba(0,0,0,0.5)";
        _ctx.fillRect(8, 8, 60, 20);
        _ctx.fillStyle = "#fff";
        _ctx.font = "12px sans-serif";
        _ctx.fillText(`FPS: ${_fps}`, 14, 22);
    }

    // Exponujeme do globálního scope
    window.initRenderer = initRenderer;
})();
