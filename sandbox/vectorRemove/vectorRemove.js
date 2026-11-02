import { Globe, Entity, OpenStreetMap, Vector } from "../../lib/og.es.js";

const globus = new Globe({
    target: "globus",
    name: "Earth",
    layers: [new OpenStreetMap()],
    atmosphereEnabled: false,
    fontsSrc: "../../res/fonts",
    resourcesSrc: "../../res"
});

const layer = new Vector("geometries", {
    diffuse: [0, 0, 0],
    ambient: [1, 1, 1]
});
layer.addTo(globus.planet);

const $ = (id) => document.getElementById(id);

// Entity -> { line, fill, lineColor } for picking the targets of the buttons and restoring the hover color.
const info = new WeakMap();

const W = -10,
    E = 30,
    S = 35,
    N = 60;

// Mixed grid: polygons are larger than their cell, so neighbors overlap and bringToFront() is visible.
function makeEntity(i, cols, dx, dy) {
    const x = W + (i % cols) * dx,
        y = S + Math.floor(i / cols) * dy;
    const kind = i % 4;
    const fill = [Math.random(), Math.random(), Math.random()];
    const fillColor = `rgba(${fill.map((c) => Math.round(c * 255)).join(",")},0.7)`;
    const lineColor = kind % 2 ? "rgba(20,20,120,1)" : "rgba(0,0,0,0.6)";

    let geometry;
    if (kind === 0) {
        const s = 0.65;
        geometry = {
            type: "POLYGON",
            coordinates: [
                [
                    [x, y],
                    [x + dx * 1.4, y + dy * 0.1],
                    [x + dx * 1.3, y + dy * 1.4],
                    [x + dx * 0.1, y + dy * 1.3]
                ],
                [
                    [x + dx * (1 - s), y + dy * (1 - s)],
                    [x + dx * s, y + dy * (1 - s)],
                    [x + dx * s, y + dy * s],
                    [x + dx * (1 - s), y + dy * s]
                ]
            ]
        };
    } else if (kind === 1) {
        geometry = {
            type: "LINESTRING",
            coordinates: [
                [x, y + dy * 0.2],
                [x + dx * 0.4, y + dy * 0.8],
                [x + dx * 0.7, y + dy * 0.2],
                [x + dx, y + dy * 0.8]
            ]
        };
    } else if (kind === 2) {
        geometry = {
            type: "MULTIPOLYGON",
            coordinates: [
                [
                    [
                        [x, y],
                        [x + dx * 0.9, y],
                        [x, y + dy * 1.2]
                    ]
                ],
                [
                    [
                        [x + dx * 1.3, y + dy * 0.3],
                        [x + dx * 1.3, y + dy * 1.3],
                        [x + dx * 0.3, y + dy * 1.3]
                    ]
                ]
            ]
        };
    } else {
        geometry = {
            type: "MULTILINESTRING",
            coordinates: [
                [
                    [x, y + dy * 0.1],
                    [x + dx, y + dy * 0.4]
                ],
                [
                    [x, y + dy * 0.6],
                    [x + dx * 0.5, y + dy * 0.9],
                    [x + dx, y + dy * 0.6]
                ]
            ]
        };
    }
    geometry.style = { fillColor, lineColor, lineWidth: 2 };

    const entity = new Entity({ geometry });
    info.set(entity, { line: kind % 2 === 1, fill });
    return entity;
}

function rebuild() {
    const count = Math.max(1, parseInt($("count").value) || 1);
    const cols = Math.ceil(Math.sqrt((count * (E - W)) / (N - S))),
        rows = Math.ceil(count / cols);
    const dx = (E - W) / cols,
        dy = (N - S) / rows;
    const entities = [];
    for (let i = 0; i < count; i++) entities.push(makeEntity(i, cols, dx, dy));
    const t = performance.now();
    layer.setEntities(entities);
    report(`rebuild: ${count} entities, ${(performance.now() - t).toFixed(1)} ms`);
}

function pick(filter) {
    const n = Math.max(1, parseInt($("n").value) || 1);
    const pool = layer.getEntities().filter(filter);
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, n);
}

const isPolygon = (e) => !info.get(e).line;
const isLine = (e) => info.get(e).line;
const any = () => true;

// Layout checks of the shared arrays of the layer's GeometryHandler: every group of arrays must be
// covered by the geometries' ranges without gaps or overlaps, and indexes must point at vertices.
const GROUPS = [
    ["poly vertices", "_polyVerticesHandlerIndex", "_polyVerticesLength", [["_polyVerticesHighMerc", 1], ["_polyVerticesLowMerc", 1], ["_polyColors", 2], ["_polyPickingColors", 2]]],
    ["poly indexes", "_polyIndexesHandlerIndex", "_polyIndexesLength", [["_polyIndexes", 1]]],
    ["line vertices", "_lineVerticesHandlerIndex", "_lineVerticesLength", [["_lineVerticesHighMerc", 1], ["_lineVerticesLowMerc", 1]]],
    ["line orders", "_lineOrdersHandlerIndex", "_lineOrdersLength", [["_lineOrders", 1]]],
    ["line colors", "_lineColorsHandlerIndex", "_lineColorsLength", [["_lineColors", 1], ["_linePickingColors", 1], ["_lineStrokeColors", 1]]],
    ["line thickness", "_lineThicknessHandlerIndex", "_lineThicknessLength", [["_lineThickness", 1], ["_lineStrokes", 1]]],
    ["line indexes", "_lineIndexesHandlerIndex", "_lineIndexesLength", [["_lineIndexes", 1]]]
];

function checkBuffers() {
    const h = layer._geometryHandler;
    const list = h._geometries;
    const errors = {};
    const fail = (name) => (errors[name] = (errors[name] || 0) + 1);

    list.forEach((g, i) => g._handlerIndex !== i && fail("list index"));

    for (const [name, offsetKey, lengthKey, arrays] of GROUPS) {
        const ranges = list.filter((g) => g[lengthKey] >= 0).sort((a, b) => a[offsetKey] - b[offsetKey]);
        let pos = 0;
        for (const g of ranges) {
            g[offsetKey] !== pos && fail(`${name}: gap or overlap`);
            pos = g[offsetKey] + g[lengthKey];
        }
        for (const [a, scale] of arrays) h[a].length !== pos * scale && fail(`${name}: ${a} length`);
    }

    // Polygon indexes of a geometry must point into its own vertices.
    for (const g of list) {
        if (g._polyIndexesLength < 0) continue;
        const lo = g._polyVerticesHandlerIndex * 0.5,
            hi = lo + g._polyVerticesLength * 0.5;
        for (let k = 0; k < g._polyIndexesLength; k++) {
            const v = h._polyIndexes[g._polyIndexesHandlerIndex + k];
            (!Number.isInteger(v) || v < lo || v >= hi) && fail("poly index outside its geometry");
        }
    }

    const lineVertices = h._lineVerticesHighMerc.length * 0.5;
    for (const v of h._lineIndexes) {
        (!Number.isInteger(v) || v < 0 || v >= lineVertices) && fail("line index outside the vertices");
    }

    const el = $("check");
    const names = Object.keys(errors);
    if (names.length) {
        el.className = "bad";
        el.textContent = "buffers BROKEN:\n" + names.map((n) => `  ${n}: ${errors[n]}`).join("\n");
    } else {
        el.className = "ok";
        el.textContent = `buffers OK (${list.length} geometries)`;
    }
}

let events = 0;
const onEntityRemove = () => events++;

function report(text) {
    $("out").textContent =
        `${text}\nentities: ${layer.getEntities().length}` +
        ($("listener").checked ? `, entityremove events: ${events}` : "");
    checkBuffers();
}

function timed(label, entities, fn) {
    events = 0;
    const t = performance.now();
    fn(entities);
    report(`${label}: ${entities.length} in ${(performance.now() - t).toFixed(1)} ms`);
}

$("rebuild").onclick = rebuild;

$("front").onclick = () => {
    const entities = pick(any);
    timed("bringToFront", entities, (es) => es.forEach((e) => e.geometry.bringToFront()));
};

// The polygon turns yellow, so it is easy to see that it is drawn above its neighbors.
$("frontOne").onclick = () => {
    const [e] = pick(isPolygon);
    if (!e) return;
    info.get(e).fill = [1, 0.85, 0];
    e.geometry.setFillColor(1, 0.85, 0, 0.7);
    timed("bringToFront polygon", [e], () => e.geometry.bringToFront());
};

// The line turns yellow and thick, so it is easy to see that it is drawn above the polygons.
$("frontLine").onclick = () => {
    const [e] = pick(isLine);
    if (!e) return;
    info.get(e).lineColor = [1, 0.85, 0];
    e.geometry.setLineColor(1, 0.85, 0, 1);
    e.geometry.setLineWidth(5);
    timed("bringToFront line", [e], () => e.geometry.bringToFront());
};

$("bulk").onclick =() => timed("removeEntities", pick(any), (es) => layer.removeEntities(es));

$("oneByOne").onclick = () => timed("removeEntity one by one", pick(any), (es) => es.forEach((e) => layer.removeEntity(e)));

$("onePolygon").onclick = () => {
    const [e] = pick(isPolygon);
    e && timed("removeEntity polygon", [e], () => layer.removeEntity(e));
};

$("oneLine").onclick = () => {
    const [e] = pick(isLine);
    e && timed("removeEntity line", [e], () => layer.removeEntity(e));
};

$("listener").onchange = (ev) => {
    ev.target.checked ? layer.events.on("entityremove", onEntityRemove) : layer.events.off("entityremove", onEntityRemove);
    report("entityremove listener " + (ev.target.checked ? "on" : "off"));
};

layer.events.on("mouseenter", (e) => {
    const entity = e.pickingObject;
    if (!entity || !entity.geometry) return;
    $("hover").checked && entity.geometry.bringToFront();
    if (info.get(entity).line) {
        entity.geometry.setLineColor(1, 0, 0, 1);
    } else {
        entity.geometry.setFillColor(1, 0, 0, 0.7);
    }
});

layer.events.on("mouseleave", (e) => {
    const entity = e.pickingObject;
    if (!entity || !entity.geometry) return;
    if (info.get(entity).line) {
        const [r, g, b] = info.get(entity).lineColor || [20 / 255, 20 / 255, 120 / 255];
        entity.geometry.setLineColor(r, g, b, 1);
    } else {
        const [r, g, b] = info.get(entity).fill;
        entity.geometry.setFillColor(r, g, b, 0.7);
    }
});

layer.events.on("lclick", (e) => {
    const entity = e.pickingObject;
    if (!entity || !entity.geometry) return;
    timed(`click: removeEntity ${info.get(entity).line ? "line" : "polygon"}`, [entity], () => layer.removeEntity(entity));
});

globus.planet.viewExtentArr([W, S, E, N]);
rebuild();
