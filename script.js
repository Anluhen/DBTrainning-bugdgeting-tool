/*************************************************************
* 1) DATA LAYER: load/save from localStorage, init sample data
*************************************************************/
const KEYS = {
    projects: 'projects',
    parts: 'parts',
    pieces: 'pieces',
    projParts: 'projectParts',
    partParts: 'partParts',
    partPieces: 'partPieces'
};

function lsLoad(k, def) {
    const v = localStorage.getItem(k);
    if (v) return JSON.parse(v);
    localStorage.setItem(k, JSON.stringify(def));
    return def;
}
function lsSave(k, arr) {
    localStorage.setItem(k, JSON.stringify(arr));
}

// initialize on first load
let projects = lsLoad(KEYS.projects, [
    { project_id: 1, name: 'Solar Powerplant', description: 'Utility-scale PV site' }
]);
let parts = lsLoad(KEYS.parts, [
    { part_id: 10, name: 'Solar Farm', description: 'PV field' },
    { part_id: 11, name: 'Substation', description: 'Step-up transformers' },
    { part_id: 12, name: 'Control Room', description: 'SCADA & relays' },
    { part_id: 20, name: 'Modules', description: 'PV modules' },
    { part_id: 21, name: 'Structures', description: 'Mounting structures' },
    { part_id: 22, name: 'Inverters', description: 'Inverter units' },
    { part_id: 23, name: 'Electrical Wiring', description: 'Cables & connectors' }
]);
let pieces = lsLoad(KEYS.pieces, [
    { piece_id: 100, name: 'Photovoltaic Module', description: '330W panel' },
    { piece_id: 101, name: 'Metal Beam', description: 'Steel I-beam' },
    { piece_id: 102, name: 'Mounting Bracket', description: 'Galvanized part' },
    { piece_id: 103, name: 'Cable', description: 'DC cable' },
    { piece_id: 104, name: 'Connector', description: 'MC4 connector' },
    { piece_id: 105, name: 'Inverter Unit', description: '50kW inverter' }
]);
let projectParts = lsLoad(KEYS.projParts, [
    { project_id: 1, part_id: 10, quantity: 1 },
    { project_id: 1, part_id: 11, quantity: 1 },
    { project_id: 1, part_id: 12, quantity: 1 }
]);
let partParts = lsLoad(KEYS.partParts, [
    { parent_part_id: 10, child_part_id: 20, quantity: 1 },
    { parent_part_id: 10, child_part_id: 21, quantity: 1 },
    { parent_part_id: 10, child_part_id: 22, quantity: 1 },
    { parent_part_id: 10, child_part_id: 23, quantity: 1 }
]);
let partPieces = lsLoad(KEYS.partPieces, [
    { part_id: 20, piece_id: 100, quantity: 5000 },
    { part_id: 21, piece_id: 101, quantity: 1000 },
    { part_id: 21, piece_id: 102, quantity: 5000 },
    { part_id: 22, piece_id: 105, quantity: 20 },
    { part_id: 23, piece_id: 103, quantity: 20000 },
    { part_id: 23, piece_id: 104, quantity: 5000 }
]);

/*************************************************************
 * 2) TABLE GENERATOR: builds an HTML table + filter/sort/form
 *************************************************************/
function buildTable(cfg) {
    // cfg = { columns:[{key,label}], rows:[obj], onRowClick?, onAdd? }
    const wrap = document.createElement('div');
    const tbl = document.createElement('table');
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');

    // headers + filters
    cfg.columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.label;
        let asc = true;
        th.onclick = () => {
            cfg.rows.sort((a, b) => {
                if (a[col.key] < b[col.key]) return asc ? -1 : 1;
                if (a[col.key] > b[col.key]) return asc ? 1 : -1;
                return 0;
            });
            asc = !asc;
            renderAllActive();  // re-render current screen
        };
        // filter input
        const inp = document.createElement('input');
        inp.className = 'filter';
        inp.placeholder = 'filter';
        inp.oninput = () => {
            const val = inp.value.toLowerCase();
            // toggle row visibilities
            Array.from(tbl.tBodies[0].rows).forEach(row => {
                const cell = row.cells[cfg.columns.indexOf(col)];
                row.style.display = cell.textContent.toLowerCase().includes(val)
                    ? '' : 'none';
            });
        };
        th.appendChild(document.createElement('br'));
        th.appendChild(inp);
        tr.appendChild(th);
    });
    thead.appendChild(tr);
    tbl.appendChild(thead);

    // body
    const tbody = document.createElement('tbody');
    cfg.rows.forEach(r => {
        const row = document.createElement('tr');
        if (cfg.onRowClick) {
            row.classList.add('clickable');
            row.onclick = () => cfg.onRowClick(r);
        }
        cfg.columns.forEach(col => {
            const td = document.createElement('td');
            td.textContent = r[col.key];
            row.appendChild(td);
        });
        tbody.appendChild(row);
    });
    tbl.appendChild(tbody);
    wrap.appendChild(tbl);

    // add-new form
    if (cfg.onAdd) {
        const form = document.createElement('form');
        form.className = 'add-row';
        cfg.columns.forEach(col => {
            const inp = document.createElement('input');
            inp.name = col.key;
            inp.placeholder = col.label;
            form.appendChild(inp);
        });
        const btn = document.createElement('button');
        btn.textContent = 'Add';
        form.appendChild(btn);

        form.onsubmit = e => {
            e.preventDefault();
            const data = {};
            new FormData(form).forEach((v, k) => data[k] = isNaN(v) ? v : Number(v));
            cfg.onAdd(data);
            // save back
            persistAll();
            renderAllActive();
            form.reset();
        };
        wrap.appendChild(form);
    }

    return wrap;
}

function persistAll() {
    lsSave(KEYS.projects, projects);
    lsSave(KEYS.parts, parts);
    lsSave(KEYS.pieces, pieces);
    lsSave(KEYS.projParts, projectParts);
    lsSave(KEYS.partParts, partParts);
    lsSave(KEYS.partPieces, partPieces);
}

/*************************************************************
 * 3) SCREEN RENDERERS
 *************************************************************/
function renderProjects() {
    const cols = [
        { key: 'project_id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
    ];
    const container = document.getElementById('tbl-projects');
    container.innerHTML = '';
    container.append(
        buildTable({
            columns: cols,
            rows: projects,
            onRowClick: p => showScreen('project-detail', p),
            onAdd: p => {
                p.project_id = projects.length
                    ? Math.max(...projects.map(x => x.project_id)) + 1 : 1;
                projects.push(p);
                projectParts.push({ project_id: p.project_id, part_id: 0, quantity: 1 });
            }
        })
    );
}

function renderParts() {
    const cols = [
        { key: 'part_id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
    ];
    const container = document.getElementById('tbl-parts');
    container.innerHTML = '';
    container.append(
        buildTable({
            columns: cols,
            rows: parts,
            onRowClick: p => showScreen('part-detail', p),
            onAdd: p => {
                p.part_id = parts.length
                    ? Math.max(...parts.map(x => x.part_id)) + 1 : 1;
                parts.push(p);
            }
        })
    );
}

function renderPieces() {
    const cols = [
        { key: 'piece_id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
    ];
    const container = document.getElementById('tbl-pieces');
    container.innerHTML = '';
    container.append(
        buildTable({
            columns: cols,
            rows: pieces,
            onAdd: pi => {
                pi.piece_id = pieces.length
                    ? Math.max(...pieces.map(x => x.piece_id)) + 1 : 1;
                pieces.push(pi);
            }
        })
    );
}

function renderProjectDetail(proj) {
    document.getElementById('project-detail-title')
        .textContent = `Project: ${proj.name} (#${proj.project_id})`;

    // PARTS in this project
    const colsP = [
        { key: 'part_id', label: 'Part ID' },
        { key: 'name', label: 'Name' },
        { key: 'quantity', label: 'Qty' }
    ];
    const rowsP = projectParts
        .filter(pp => pp.project_id === proj.project_id)
        .map(pp => {
            const p = parts.find(x => x.part_id === pp.part_id) || {};
            return { part_id: pp.part_id, name: p.name || '—', quantity: pp.quantity };
        });

    const divP = document.getElementById('tbl-project-parts');
    divP.innerHTML = '';
    divP.append(
        buildTable({
            columns: colsP,
            rows: rowsP,
            onRowClick: r => showScreen('part-detail', parts.find(x => x.part_id === r.part_id)),
            onAdd: pp => {
                projectParts.push({
                    project_id: proj.project_id,
                    part_id: pp.part_id,
                    quantity: pp.quantity
                });
            }
        })
    );

    // PIECES directly in this project (if any) – normally none by design
    const colsPi = [
        { key: 'piece_id', label: 'Piece ID' },
        { key: 'name', label: 'Name' },
        { key: 'quantity', label: 'Qty' }
    ];
    const rowsPi = []; // our model doesn’t attach pieces directly to projects
    const divPi = document.getElementById('tbl-project-pieces');
    divPi.innerHTML = '';
    divPi.append(
        buildTable({
            columns: colsPi,
            rows: rowsPi
        })
    );
}

function renderPartDetail(part) {
    document.getElementById('part-detail-title')
        .textContent = `Part: ${part.name} (#${part.part_id})`;

    // CHILD PARTS
    const colsPP = [
        { key: 'child_part_id', label: 'Child Part ID' },
        { key: 'name', label: 'Name' },
        { key: 'quantity', label: 'Qty' }
    ];
    const rowsPP = partParts
        .filter(pp => pp.parent_part_id === part.part_id)
        .map(pp => {
            const c = parts.find(x => x.part_id === pp.child_part_id) || {};
            return {
                child_part_id: pp.child_part_id,
                name: c.name || '—',
                quantity: pp.quantity
            };
        });
    const divPP = document.getElementById('tbl-child-parts');
    divPP.innerHTML = '';
    divPP.append(
        buildTable({
            columns: colsPP,
            rows: rowsPP,
            onRowClick: r => showScreen('part-detail',
                parts.find(x => x.part_id === r.child_part_id)),
            onAdd: np => {
                partParts.push({
                    parent_part_id: part.part_id,
                    child_part_id: np.child_part_id,
                    quantity: np.quantity
                });
            }
        })
    );

    // PIECES in this part
    const colsPi = [
        { key: 'piece_id', label: 'Piece ID' },
        { key: 'name', label: 'Name' },
        { key: 'quantity', label: 'Qty' }
    ];
    const rowsPi = partPieces
        .filter(pp => pp.part_id === part.part_id)
        .map(pp => {
            const pc = pieces.find(x => x.piece_id === pp.piece_id) || {};
            return {
                piece_id: pp.piece_id,
                name: pc.name || '—',
                quantity: pp.quantity
            };
        });
    const divPi = document.getElementById('tbl-part-pieces');
    divPi.innerHTML = '';
    divPi.append(
        buildTable({
            columns: colsPi,
            rows: rowsPi,
            onAdd: np => {
                partPieces.push({
                    part_id: part.part_id,
                    piece_id: np.piece_id,
                    quantity: np.quantity
                });
            }
        })
    );
}

/*************************************************************
 * 4) SPA ROUTING
 *************************************************************/
let pendingParam = null;
function showScreen(name, param) {
    // hide all
    document.querySelectorAll('.screen').forEach(d => d.classList.remove('active'));
    // show target
    document.getElementById(name).classList.add('active');
    // remember param for detail screens
    pendingParam = param;
    // render
    renderAllActive();
}
function renderAllActive() {
    if (document.getElementById('projects').classList.contains('active'))
        return renderProjects();
    if (document.getElementById('parts').classList.contains('active'))
        return renderParts();
    if (document.getElementById('pieces').classList.contains('active'))
        return renderPieces();
    if (document.getElementById('project-detail').classList.contains('active'))
        return renderProjectDetail(pendingParam);
    if (document.getElementById('part-detail').classList.contains('active'))
        return renderPartDetail(pendingParam);
}

// initial
showScreen('projects');