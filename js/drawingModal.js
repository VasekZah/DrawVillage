import { G } from './globals.js';
import { CONFIG } from './config.js';

const assetList = [
    { id: 'settler', name: 'Osadník' },
    { id: 'child', name: 'Dítě' },
    { id: 'wood', name: 'Surovina: Dřevo' },
    { id: 'stone', name: 'Surovina: Kámen' },
    { id: 'food', name: 'Surovina: Jídlo' },
    { id: 'tree', name: 'Strom' },
    { id: 'sapling', name: 'Sazenice' },
    { id: 'berryBush', name: 'Keř s bobulemi' },
    ...Object.keys(CONFIG.BUILDING_INFO).map(id => ({ id, name: `Budova: ${CONFIG.BUILDING_INFO[id].name}` }))
];
const iconList = [
    { id: 'icon_settler', name: 'Ikona: Populace' },
    { id: 'icon_day', name: 'Ikona: Den' },
    { id: 'icon_time', name: 'Ikona: Čas' },
    { id: 'icon_idle', name: 'Ikona: Nezaměstnaní' },
    { id: 'icon_builder', name: 'Ikona: Stavitel' },
    { id: 'icon_lumberjack', name: 'Ikona: Dřevorubec' },
    { id: 'icon_gatherer', name: 'Ikona: Sběrač' },
    { id: 'icon_miner', name: 'Ikona: Horník' },
    { id: 'icon_farmer', name: 'Ikona: Farmář' },
    { id: 'icon_forester', name: 'Ikona: Lesník' },
    { id: 'icon_pause', name: 'Ikona: Pauza' },
    { id: 'icon_play', name: 'Ikona: Play' },
    { id: 'icon_ff2', name: 'Ikona: 2x Rychlost' },
    { id: 'icon_ff4', name: 'Ikona: 4x Rychlost' }
];
const fullAssetList = [...assetList, ...iconList];
let currentAssetIndex = 0;
let isDrawing = false;
let isCanvasDirty = false;
let lastX = 0;
let lastY = 0;
let modal, canvas, ctx, assetListElement, currentAssetNameElement, saveBtn, startBtn, clearBtn, exportBtn, importBtn, importFileInput;

function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.closePath();
}

function updateButtonStates() {
    const assetsDrawn = Object.keys(G.state.userAssets).length;
    const allAssetsDrawn = assetsDrawn >= fullAssetList.length;
    saveBtn.disabled = !isCanvasDirty;
    startBtn.disabled = !allAssetsDrawn;
}

function setupDrawingCanvas() {
    const getCoords = (e) => {
        const rect = canvas.getBoundingClientRect();
        const event = e.touches ? e.touches[0] : e;
        return [event.clientX - rect.left, event.clientY - rect.top];
    }
    const startDrawing = (e) => {
        e.preventDefault(); isDrawing = true; isCanvasDirty = true;
        [lastX, lastY] = getCoords(e); updateButtonStates();
    }
    const draw = (e) => {
        if (!isDrawing) return; e.preventDefault();
        const [currentX, currentY] = getCoords(e);
        drawLine(lastX, lastY, currentX, currentY);
        [lastX, lastY] = [currentX, currentY];
    }
    const stopDrawing = () => { isDrawing = false; }
    canvas.addEventListener('mousedown', startDrawing); canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing); canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false }); canvas.addEventListener('touchend', stopDrawing);
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
        currentAssetNameElement.textContent = `Kreslení: ${fullAssetList[currentAssetIndex].name}`;
    }
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    isCanvasDirty = false; updateButtonStates();
}

function selectAsset(index) {
    if (Object.keys(G.state.userAssets).length >= fullAssetList.length) {
       currentAssetNameElement.textContent = "Vše hotovo! Můžeš spustit hru.";
       clearCanvas(); return;
    }
    currentAssetIndex = index; clearCanvas(); renderAssetList();
}

function handleExport() {
    if (Object.keys(G.state.userAssets).length === 0) {
        alert("Není co exportovat. Nejdříve něco nakreslete.");
        return;
    }
    const dataStr = JSON.stringify(G.state.userAssets, null, 2);
    const dataBlob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.download = 'moje_kresby.json';
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
                throw new Error("Neplatný formát souboru.");
            }
            Object.assign(G.state.userAssets, importedData);
            alert(`${Object.keys(importedData).length} kreseb bylo naimportováno!`);
            renderAssetList();
            updateButtonStates();
        } catch (error) {
            alert("Chyba při importu: " + error.message);
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
    
    renderAssetList(); setupDrawingCanvas(); updateButtonStates();

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
            currentAssetNameElement.textContent = "Vše hotovo! Můžeš spustit hru.";
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
            alert("Chyba: Nepodařilo se načíst všechny vaše kresby.");
        });
    });
}
