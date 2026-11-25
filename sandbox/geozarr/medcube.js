import { Globe, OpenStreetMap, GeoZarrLayer, GlobusRgbTerrain, LonLat, geotiff } from "../../lib/og.es.js";

// The datacube of the EOxElements "GeoZarr multiband" story: daily Mediterranean ocean variables from 2016,
// time × depth × lat × lon, 3 multiscales levels, sharded and zstd compressed Zarr v3
const URL = "https://s3.waw4-1.cloudferro.com/EarthCODE/OSCAssets/med_cubes/ocean-med-biophysics.zarr";

// The domains are about the 2nd and 98th percentiles of the data
const VARIABLES = {
    to: { title: "Temperature (°C)", domain: [13, 26], limits: [9, 32], colorScale: "turbo" },
    so: { title: "Salinity (PSU)", domain: [36.8, 39.3], limits: [33.9, 40.4], colorScale: "viridis" },
    PP: { title: "Primary production (mg C m⁻³ d⁻¹)", domain: [0, 10], limits: [0, 60], colorScale: "inferno" },
    ugo: { title: "Geostrophic eastward velocity (m/s)", domain: [-0.3, 0.3], limits: [-1, 1], colorScale: "coolwarm" },
    vgo: { title: "Geostrophic northward velocity (m/s)", domain: [-0.3, 0.3], limits: [-1, 1], colorScale: "coolwarm" },
    zo: { title: "Absolute height (m)", domain: [-0.2, 0.2], limits: [-0.5, 0.5], colorScale: "coolwarm" },
    // 2-D variables, no depth dimension
    ZEU: { title: "Euphotic depth (m)", domain: [0, 130], limits: [0, 150], colorScale: "viridis" },
    mlotst: { title: "Mixed layer depth (m)", domain: [0, 100], limits: [0, 155], colorScale: "inferno" }
};

const globe = new Globe({
    target: "globus",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    layers: [new OpenStreetMap()],
    atmosphereEnabled: false,
    lightEnabled: false,
    fontsSrc: "../../res/fonts",
    resourcesSrc: "../../res"
});

const variableSelect = document.getElementById("variableSelect");
const timeSlider = document.getElementById("timeSlider");
const timeVal = document.getElementById("timeVal");
const playButton = document.getElementById("playButton");
const depthRow = document.getElementById("depthRow");
const depthSlider = document.getElementById("depthSlider");
const depthVal = document.getElementById("depthVal");
const minSlider = document.getElementById("minSlider");
const maxSlider = document.getElementById("maxSlider");
const rangeVal = document.getElementById("rangeVal");
const legend = document.getElementById("legend");
const opacitySlider = document.getElementById("opacitySlider");
const opacityVal = document.getElementById("opacityVal");
const status = document.getElementById("status");

for (const [id, { title }] of Object.entries(VARIABLES)) {
    variableSelect.add(new Option(title, id));
}

let currentLayer = null;
let timeValues = [];
let depthValues = [];
// The time and depth stay selected when the variable changes
let timeIndex = 0;
let depthIndex = 0;
let flown = false;

async function loadVariable(id) {
    const variable = VARIABLES[id];

    if (currentLayer) {
        globe.planet.removeLayer(currentLayer);
        currentLayer = null;
    }

    status.textContent = "Loading…";

    // A 2-D variable has no depth, an unknown dimension would not be resolved
    const hasDepth = id !== "ZEU" && id !== "mlotst";
    const dimensions = hasDepth ? { time: timeIndex, depth: depthIndex } : { time: timeIndex };

    const layer = new GeoZarrLayer(id, {
        url: URL,
        variable: id,
        dimensions,
        opacity: parseFloat(opacitySlider.value),
        renderOptions: {
            single: { band: 1, colorScale: variable.colorScale, domain: [...variable.domain] }
        }
    });

    globe.planet.addLayer(layer);
    currentLayer = layer;

    setupRange(variable);

    try {
        const meta = await layer.whenReady();
        if (currentLayer !== layer) return;

        const dims = layer.getDimensions();
        console.log("GeoZarr metadata", meta, "dimensions", dims);
        status.textContent = `${meta.width}×${meta.height}, ${meta.overviewCount} levels, EPSG:${meta.crsCode}`;

        const time = dims.find((d) => d.name === "time");
        timeValues = time?.values ?? [];
        timeSlider.max = String((time?.size ?? 1) - 1);
        timeSlider.value = String(timeIndex);
        timeVal.textContent = formatDate(timeValues[timeIndex]);

        const depth = dims.find((d) => d.name === "depth");
        depthRow.hidden = !depth;
        if (depth) {
            depthValues = depth.values ?? [];
            depthSlider.max = String(depth.size - 1);
            depthSlider.value = String(depthIndex);
            depthVal.textContent = formatDepth(depthValues[depthIndex]);
        }

        if (!flown) {
            flown = true;
            globe.planet.flyExtent(layer.getExtent());
        }
    } catch (err) {
        status.textContent = `Failed: ${err.message}`;
        console.error("Failed to load GeoZarr:", err);
    }
}

function formatDate(value) {
    return value === undefined ? "" : String(value).slice(0, 10);
}

function formatDepth(value) {
    return value === undefined ? "" : `${Number(value).toFixed(0)} m`;
}

function formatValue(v) {
    if (Math.abs(v) >= 100) return Math.round(v).toString();
    if (Math.abs(v) >= 10) return v.toFixed(1);
    return v.toFixed(2);
}

/**
 * CSS gradient of a color scale, a table of RGBA colors is sampled in 16 stops.
 */
function colorScaleGradient(name) {
    const { colors, positions } = geotiff.COLORSCALES[name];
    let stops;
    if (colors instanceof Uint8Array) {
        const n = colors.length / 4;
        stops = Array.from({ length: 16 }, (_, i) => {
            const k = Math.round((i / 15) * (n - 1)) * 4;
            return `rgb(${colors[k]},${colors[k + 1]},${colors[k + 2]}) ${((i / 15) * 100).toFixed(1)}%`;
        });
    } else {
        stops = colors.map((c, i) => `${c} ${((positions?.[i] ?? i / (colors.length - 1)) * 100).toFixed(1)}%`);
    }
    return `linear-gradient(to right, ${stops.join(", ")})`;
}

function setupRange(variable) {
    const [lo, hi] = variable.limits;
    for (const [slider, value] of [
        [minSlider, variable.domain[0]],
        [maxSlider, variable.domain[1]]
    ]) {
        Object.assign(slider, { min: lo, max: hi, step: (hi - lo) / 200, value });
    }
    legend.style.background = colorScaleGradient(variable.colorScale);
    updateRangeLabel();
}

function updateRangeLabel() {
    rangeVal.textContent = `${formatValue(parseFloat(minSlider.value))} – ${formatValue(parseFloat(maxSlider.value))}`;
}

function applyRange(fullUpdate) {
    updateRangeLabel();
    if (!currentLayer) return;
    const variable = VARIABLES[variableSelect.value];
    const a = parseFloat(minSlider.value);
    const b = parseFloat(maxSlider.value);
    currentLayer.setRenderOptions(
        { single: { band: 1, colorScale: variable.colorScale, domain: [Math.min(a, b), Math.max(a, b)] } },
        fullUpdate
    );
}

// Visible tiles are styled while dragging, the other cached tiles once the slider is released
for (const slider of [minSlider, maxSlider]) {
    slider.addEventListener("input", () => applyRange(false));
    slider.addEventListener("change", () => applyRange(true));
}

let dimensionFrame = null;

/**
 * Selects the time and depth on the next frame, so a dragged slider sets the last value only. A shard inner chunk
 * holds 7 days and 9 depths, its neighbours come from the decoded chunk without a new request.
 */
function applyDimensions() {
    cancelAnimationFrame(dimensionFrame);
    dimensionFrame = requestAnimationFrame(() => {
        if (!currentLayer) return;
        const dims = { time: timeIndex };
        if (!depthRow.hidden) dims.depth = depthIndex;
        currentLayer.setDimensions(dims);
    });
}

function setTime(index) {
    timeIndex = index;
    timeSlider.value = String(index);
    timeVal.textContent = formatDate(timeValues[index]);
    applyDimensions();
}

timeSlider.addEventListener("input", () => setTime(parseInt(timeSlider.value, 10)));

depthSlider.addEventListener("input", () => {
    depthIndex = parseInt(depthSlider.value, 10);
    depthVal.textContent = formatDepth(depthValues[depthIndex]);
    applyDimensions();
});

// Shortest time a day is shown while playing, in milliseconds
const PLAY_FRAME_TIME = 1000;

// How often the player checks whether the next day can be shown
const PLAY_POLL_TIME = 16;

let playTimer = null;
let frameStart = 0;

function playStep() {
    // The next day comes once the tiles of this one are loaded, so playing does not run ahead of the data
    if (!currentLayer || !currentLayer.isIdle || performance.now() - frameStart < PLAY_FRAME_TIME) {
        playTimer = setTimeout(playStep, PLAY_POLL_TIME);
        return;
    }

    frameStart = performance.now();
    setTime((timeIndex + 1) % Math.max(timeValues.length, 1));
    playTimer = setTimeout(playStep, PLAY_POLL_TIME);
}

function startPlaying() {
    frameStart = performance.now();
    playButton.textContent = "⏸";
    playButton.title = "Pause";
    playTimer = setTimeout(playStep, PLAY_POLL_TIME);
}

function stopPlaying() {
    clearTimeout(playTimer);
    playTimer = null;
    playButton.textContent = "▶";
    playButton.title = "Play";
}

playButton.addEventListener("click", () => (playTimer ? stopPlaying() : startPlaying()));

variableSelect.addEventListener("change", () => loadVariable(variableSelect.value));

opacitySlider.addEventListener("input", () => {
    const opacity = parseFloat(opacitySlider.value);
    opacityVal.textContent = `${Math.round(opacity * 100)}%`;
    if (currentLayer) {
        currentLayer.opacity = opacity;
    }
});

window.globe = globe;

loadVariable(variableSelect.value);
