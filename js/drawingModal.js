import { G } from './globals.js';
import { CONFIG } from './config.js';

const assetList = [
    { id: 'settler', name: 'Settler' },
    { id: 'child', name: 'Child' },
    { id: 'wood', name: 'Resource: Wood' },
    { id: 'stone', name: 'Resource: Stone' },
    { id: 'food', name: 'Resource: Food' },
    { id: 'tree', name: 'Tree' },
    { id: 'sapling', name: 'Sapling' },
    { id: 'berryBush', name: 'Berry Bush' },
    ...Object.keys(CONFIG.BUILDING_INFO).map(id => ({ id, name: `Building: ${CONFIG.BUILDING_INFO[id].name}` }))
];

const iconList = [
    { id: 'icon_settler', name: 'Icon: Population' },
    { id: 'icon_day', name: 'Icon: Day' },
    { id: 'icon_time', name: 'Icon: Time' },
    { id: 'icon_idle', name: 'Icon: Idle' },
    { id: 'icon_builder', name: 'Icon: Builder' },
    { id: 'icon_lumberjack', name: 'Icon: Lumberjack' },
    { id: 'icon_gatherer', name: 'Icon: Gatherer' },
    { id: 'icon_miner', name: 'Icon: Miner' },
    { id: 'icon_farmer', name: 'Icon: Farmer' },
    { id: 'icon_forester', name: 'Icon: Forester' },
    { id: 'icon_pause', name: 'Icon: Pause' },
    { id: 'icon_play', name: 'Icon: Play' },
    { id: 'icon_ff2', name: 'Icon: 2x Speed' },
    { id: 'icon_ff4', name: 'Icon: 4x Speed' }
];

const fullAssetList = [...assetList, ...iconList];

let currentAssetIndex = 0;
let isDrawing = false;
let isCanvasDirty = false;
let points = []; // Pro plynulé kreslení

let modal, canvas, ctx, assetListElement, currentAssetNameElement, saveBtn, startBtn, clearBtn, exportBtn, importBtn, importFileInput;

function updateButtonStates() {
    const assetsDrawn = Object.keys(G.state.userAssets).length;
    const allAssetsDrawn = assetsDrawn >= fullAssetList.length;
    saveBtn.disabled = !isCanvasDirty;
    startBtn.disabled = !allAssetsDrawn;
}

// Přepracovaná logika kreslení pro plynulejší čáry
function setupDrawingCanvas() {
    ctx.lineWidth = 6; // Zesílení pera
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2d3748';

    const getCoords = (e) => {
        const rect = canvas.getBoundingClientRect();
        const event = e.touches ? e.touches[0] : e;
        return [event.clientX - rect.left, event.clientY - rect.top];
    }

    const startDrawing = (e) => {
        e.preventDefault();
        isDrawing = true;
        isCanvasDirty = true;
        points = [getCoords(e)];
        updateButtonStates();
    }

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        
        const [x, y] = getCoords(e);
        points.push([x, y]);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let p1 = points[0];
        let p2 = points[1];

        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);

        for (let i = 1; i < points.length; i++) {
            const midPoint = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
            ctx.quadraticCurveTo(p1[0], p1[1], midPoint[0], midPoint[1]);
            p1 = points[i];
            p2 = points[i+1];
        }
        ctx.lineTo(p1[0], p1[1]);
        ctx.stroke();
    }

    const stopDrawing = () => {
        if (!isDrawing) return;
        isDrawing = false;
        points = [];
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
}


function renderAssetList() {
    assetListElement.innerHTML = '';
    fullAssetList.forEach((asset, index) => {
        const li = document.createElement('li'); li.textContent = asset.name; li.dataset.index = index;
        if (index === currentAssetIndex) li.classList.add('active');
        if (G.state.userAssets[asset.id]) li.classList.add('drawn');
        assetListElement.appendChild(li);
    });
    if (fullAssetList[currentAssetIndex]) {
        currentAssetNameElement.textContent = `Drawing: ${fullAssetList[currentAssetIndex].name}`;
    }
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    isCanvasDirty = false;
    updateButtonStates();
}

function selectAsset(index) {
    if (Object.keys(G.state.userAssets).length >= fullAssetList.length) {
       currentAssetNameElement.textContent = "All done! You can start the game.";
       clearCanvas(); return;
    }
    currentAssetIndex = index;
    clearCanvas();
    renderAssetList();
}

function handleExport() {
    if (Object.keys(G.state.userAssets).length === 0) {
        alert("Nothing to export. Draw something first.");
        return;
    }
    const dataStr = JSON.stringify(G.state.userAssets, null, 2);
    const dataBlob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.download = 'my_drawings.json';
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (typeof importedData !== 'object' || importedData === null) {
                throw new Error("Invalid file format.");
            }
            Object.assign(G.state.userAssets, importedData);
            alert(`${Object.keys(importedData).length} drawings were imported!`);
            renderAssetList();
            updateButtonStates();
        } catch (error) {
            alert("Error during import: " + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = null;
}

export function initDrawingModal(startGameCallback) {
    modal = document.getElementById('drawing-modal'); canvas = document.getElementById('drawing-canvas');
    assetListElement = document.getElementById('asset-list'); currentAssetNameElement = document.getElementById('current-asset-name');
    clearBtn = document.getElementById('clear-drawing-btn'); saveBtn = document.getElementById('save-drawing-btn');
    startBtn = document.getElementById('start-game-btn'); exportBtn = document.getElementById('export-btn');
    importBtn = document.getElementById('import-btn'); importFileInput = document.getElementById('import-file-input');
    ctx = canvas.getContext('2d');
    
    renderAssetList();
    setupDrawingCanvas();
    updateButtonStates();

    assetListElement.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') selectAsset(parseInt(e.target.dataset.index));
    });
    clearBtn.addEventListener('click', clearCanvas);
    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', handleImport);

    saveBtn.addEventListener('click', () => {
        if (!isCanvasDirty) return;
        const currentAsset = fullAssetList[currentAssetIndex];
        G.state.userAssets[currentAsset.id] = canvas.toDataURL();
        renderAssetList();
        let nextIndex = -1;
        for (let i = 1; i <= fullAssetList.length; i++) {
            const potentialIndex = (currentAssetIndex + i) % fullAssetList.length;
            if (!G.state.userAssets[fullAssetList[potentialIndex].id]) {
                nextIndex = potentialIndex;
                break;
            }
        }
        updateButtonStates();
        if (nextIndex !== -1) {
            selectAsset(nextIndex);
        } else {
            currentAssetNameElement.textContent = "All done! You can start the game.";
            clearCanvas();
        }
    });

    startBtn.addEventListener('click', () => {
        if (startBtn.disabled) return;
        modal.style.display = 'none';
        document.getElementById('game-container').style.display = 'flex';
        const promises = Object.entries(G.state.userAssets).map(([id, dataUrl]) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => { G.state.loadedUserAssets[id] = img; resolve(); };
                img.onerror = reject;
                img.src = dataUrl;
            });
        });
        Promise.all(promises).then(startGameCallback).catch(err => {
            console.error("Failed to load one or more user assets.", err);
            alert("Error: Failed to load all of your drawings.");
        });
    });
}
