
// Data structures
let materials = {
    1: { id: 1, description: 'Car', baseCost: 0 },
    2: { id: 2, description: 'Frame', baseCost: 2000 },
    3: { id: 3, description: 'Engine', baseCost: 0 },
    4: { id: 4, description: 'Piston', baseCost: 250 },
    5: { id: 5, description: 'Valve', baseCost: 75 }
};
let boms = {
    1: {
        parentMaterialId: 1, items: [
            { componentId: 2, quantity: 1, cost: 2000 },
            { componentId: 3, quantity: 1, cost: 5000 }
        ]
    },
    3: {
        parentMaterialId: 3, items: [
            { componentId: 4, quantity: 4, cost: 250 },
            { componentId: 5, quantity: 16, cost: 75 }
        ]
    }
};
let costOverrides = {};
let nextMatId = 6, nextBOMId = 3, currentMaterialId = null;

// Persistence
function loadData() {
    const m = localStorage.getItem('materials');
    const bm = localStorage.getItem('boms');
    const co = localStorage.getItem('costOverrides');
    const nm = localStorage.getItem('nextMatId');
    if (m) materials = JSON.parse(m);
    if (bm) boms = JSON.parse(bm);
    if (co) costOverrides = JSON.parse(co);
    if (nm) nextMatId = +nm;
}
function saveData() {
    localStorage.setItem('materials', JSON.stringify(materials));
    localStorage.setItem('boms', JSON.stringify(boms));
    localStorage.setItem('costOverrides', JSON.stringify(costOverrides));
    localStorage.setItem('nextMatId', nextMatId);
}

// Compute cost utilities
function getComputedCost(id) {
    const bomObj = boms[id];
    if (!bomObj || bomObj.items.length === 0) return null;
    return bomObj.items.reduce((sum, it) => sum + it.quantity * it.cost, 0);
}
function getMaterialCost(id) {
    const comp = getComputedCost(id);
    if (comp != null) return costOverrides[id] != null ? costOverrides[id] : comp;
    return materials[id].baseCost;
}

// DOM refs
const materialsList = document.getElementById('materialsList');
const bomContainer = document.getElementById('bomContainer');
const breadcrumb = document.getElementById('breadcrumb');
const showAddMatBtn = document.getElementById('showAddMaterial');
const addMatForm = document.getElementById('addMaterialForm');
const cancelAddMat = document.getElementById('cancelAddMat');
const addMatSubmit = document.getElementById('addMatSubmit');

// Render sidebar
function renderMaterials() {
    materialsList.innerHTML = '';
    Object.values(materials).forEach(m => {
        const li = document.createElement('li');
        li.textContent = `${m.description} (${getMaterialCost(m.id).toFixed(2)})`;
        li.addEventListener('click', () => selectMaterial(m.id));
        materialsList.appendChild(li);
    });
}

// Select material
function selectMaterial(id) {
    currentMaterialId = id;
    breadcrumb.innerHTML = `<span onclick=\"clearSelection()\">Materials</span> > ${materials[id].description} `;
    renderBOM(id);
}
window.clearSelection = () => {
    currentMaterialId = null;
    breadcrumb.innerHTML = '';
    bomContainer.innerHTML = '<p>Select a material to view its Bill of Materials.</p>';
};

// Render BOM
function renderBOM(id) {
    const bomObj = boms[id] || { items: [] };
    const items = bomObj.items;
    const computed = getComputedCost(id);
    const displayCost = getMaterialCost(id);

    let html = `< h2 > BOM for ${materials[id].description}</h2 > `;
    html += `< div id =\"costControls\">Cost: <input id=\"materialCostInput\" type=\"number\" step=\"0.01\" value=\"${displayCost.toFixed(2)}\" />`;
    if (computed != null) html += `<button id=\"resetCostBtn\">Reset</button>`;
    html += `</div>`;

    html += '<table><thead><tr><th>Component</th><th>Qty</th><th>Unit Cost</th><th>Line Cost</th><th>Action</th></tr></thead><tbody>';
    items.forEach((it, idx) => {
        const line = it.quantity * it.cost;
        html += `<tr>` +
            `<td data-id=\"${it.componentId}\">${materials[it.componentId].description}</td>` +
            `<td><input data-idx=\"${idx}\" data-field=\"quantity\" type=\"number\" value=\"${it.quantity}\" /></td>` +
            `<td><input data-idx=\"${idx}\" data-field=\"cost\" type=\"number\" step=\"0.01\" value=\"${it.cost}\" /></td>` +
            `<td>${line.toFixed(2)}</td>` +
            `<td><button class=\"delete-btn\" data-idx=\"${idx}\">Delete</button></td>` +
            `</tr>`;
    });
    // Add-row
    html += `<tr class=\"add-row\"><td><input id=\"newDesc\" placeholder=\"Component desc\" /></td>` +
        `<td><input id=\"newQty\" type=\"number\" placeholder=\"Qty\" /></td>` +
        `<td><input id=\"newUnitCost\" type=\"number\" step=\"0.01\" placeholder=\"Unit cost\" /></td>` +
        `<td></td><td><button id=\"addRowBtn\">Add</button></td></tr>`;
    html += '</tbody></table>';
    if (computed != null) html += `<div class=\"total-cost\">Total Cost of BOM: ${computed.toFixed(2)}</div>`;

    bomContainer.innerHTML = html;

    // Cost input handler
    document.getElementById('materialCostInput').addEventListener('change', e => {
        const val = parseFloat(e.target.value);
        if (isNaN(val) || val < 0) { alert('Enter valid cost'); e.target.value = displayCost.toFixed(2); return; }
        if (computed != null) costOverrides[id] = val;
        else materials[id].baseCost = val;
        saveData(); renderMaterials();
    });
    const resetBtn = document.getElementById('resetCostBtn');
    if (resetBtn) resetBtn.addEventListener('click', () => { delete costOverrides[id]; saveData(); renderBOM(id); });

    // Item change handlers
    bomContainer.querySelectorAll('input[data-field]').forEach(inp => {
        inp.addEventListener('change', e => {
            const idx = +e.target.dataset.idx;
            const field = e.target.dataset.field;
            const val = field === 'quantity' ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
            if (isNaN(val) || val < 0) { alert('Invalid value'); renderBOM(id); return; }
            items[idx][field] = val;
            saveData(); renderBOM(id);
        });
    });

    // Delete handlers
    bomContainer.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const idx = +e.target.dataset.idx;
            items.splice(idx, 1);
            saveData(); renderBOM(id);
        });
    });

    // Row click navigation
    bomContainer.querySelectorAll('td[data-id]').forEach(td => {
        td.addEventListener('click', () => selectMaterial(+td.dataset.id));
    });

    // Add row handler
    document.getElementById('addRowBtn').addEventListener('click', () => {
        const desc = document.getElementById('newDesc').value.trim();
        const qty = parseInt(document.getElementById('newQty').value, 10);
        const uc = parseFloat(document.getElementById('newUnitCost').value);
        if (!desc || isNaN(qty) || qty <= 0 || isNaN(uc) || uc < 0) { alert('Enter valid values'); return; }
        let comp = Object.values(materials).find(m => m.description === desc);
        if (!comp) { comp = { id: nextMatId, description: desc, baseCost: uc }; materials[nextMatId] = comp; nextMatId++; }
        if (!boms[id]) boms[id] = { parentMaterialId: id, items: [] };
        boms[id].items.push({ componentId: comp.id, quantity: qty, cost: uc });
        saveData(); renderBOM(id);
    });
}

// Sidebar add material handlers
showAddMatBtn.addEventListener('click', () => {
    addMatForm.style.display = 'block';
    showAddMatBtn.style.display = 'none';
});
cancelAddMat.addEventListener('click', () => {
    addMatForm.reset();
    addMatForm.style.display = 'none';
    showAddMatBtn.style.display = 'block';
});
addMatSubmit.addEventListener('click', () => {
    const desc = document.getElementById('newMatDesc').value.trim();
    const cost = parseFloat(document.getElementById('newMatCost').value);
    if (desc && !isNaN(cost)) {
        materials[nextMatId] = { id: nextMatId, description: desc, baseCost: cost };
        nextMatId++;
        saveData();
        renderMaterials();
    } else {
        alert('Please enter valid project details.');
    }
    addMatForm.reset();
    addMatForm.style.display = 'none';
    showAddMatBtn.style.display = 'block';
});

// Initialize
loadData();
renderMaterials();
