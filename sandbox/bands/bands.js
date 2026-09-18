import {
    Globe,
    OpenStreetMap,
    GeoTIFFLayer
} from "../../lib/og.es.js";

const COG_URL = "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/36/Q/WD/2020/7/S2A_36QWD_20200701_0_L2A/TCI.tif";
let currentLayer = null;
let currentMetadata = null;

// Initialize Globe
const globe = new Globe({
    target: "globus",
    name: "Earth",
    layers: [new OpenStreetMap()],
    atmosphereEnabled: false,
    lightEnabled: false,
    fontsSrc: "../../res/fonts",
    resourcesSrc: "../../res"
});

// DOM Elements
const rgbRedBand = document.getElementById("rgbRedBand");
const rgbGreenBand = document.getElementById("rgbGreenBand");
const rgbBlueBand = document.getElementById("rgbBlueBand");

const rgbRedMinSlider = document.getElementById("rgbRedMinSlider");
const rgbRedMaxSlider = document.getElementById("rgbRedMaxSlider");
const rgbRedMinVal = document.getElementById("rgbRedMinVal");
const rgbRedMaxVal = document.getElementById("rgbRedMaxVal");

const rgbGreenMinSlider = document.getElementById("rgbGreenMinSlider");
const rgbGreenMaxSlider = document.getElementById("rgbGreenMaxSlider");
const rgbGreenMinVal = document.getElementById("rgbGreenMinVal");
const rgbGreenMaxVal = document.getElementById("rgbGreenMaxVal");

const rgbBlueMinSlider = document.getElementById("rgbBlueMinSlider");
const rgbBlueMaxSlider = document.getElementById("rgbBlueMaxSlider");
const rgbBlueMinVal = document.getElementById("rgbBlueMinVal");
const rgbBlueMaxVal = document.getElementById("rgbBlueMaxVal");

function formatValue(v) {
    if (Math.abs(v) >= 100) return Math.round(v).toString();
    if (Math.abs(v) >= 10) return Number(v).toFixed(1);
    return Number(v).toFixed(2);
}

function configureChannelSlider(sliderMin, sliderMax, labelMin, labelMax, bandIndex) {
    if (!currentMetadata) return;
    const b = currentMetadata.bands[bandIndex] || { min: 0, max: 255 };
    const bMin = Number.isFinite(b.min) ? b.min : 0;
    const bMax = Number.isFinite(b.max) && b.max > bMin ? b.max : bMin + 255;
    const range = bMax - bMin;
    const step = range > 10 ? 1 : (range / 200);

    sliderMin.min = bMin;
    sliderMin.max = bMax;
    sliderMin.step = step;
    sliderMin.value = bMin;

    sliderMax.min = bMin;
    sliderMax.max = bMax;
    sliderMax.step = step;
    sliderMax.value = bMax;

    labelMin.textContent = formatValue(bMin);
    labelMax.textContent = formatValue(bMax);
}

function populateBandSelect(selectEl, count, selectedVal) {
    selectEl.innerHTML = "";
    for (let i = 1; i <= count; i++) {
        const opt = document.createElement("option");
        opt.value = i.toString();
        opt.textContent = `Band ${i}`;
        if (i === selectedVal) opt.selected = true;
        selectEl.appendChild(opt);
    }
}

function applyRgbComposite(fullUpdate = false) {
    if (!currentLayer) return;

    const rBand = parseInt(rgbRedBand.value, 10);
    const gBand = parseInt(rgbGreenBand.value, 10);
    const bBand = parseInt(rgbBlueBand.value, 10);

    const rMin = parseFloat(rgbRedMinSlider.value);
    const rMax = parseFloat(rgbRedMaxSlider.value);
    const gMin = parseFloat(rgbGreenMinSlider.value);
    const gMax = parseFloat(rgbGreenMaxSlider.value);
    const bMin = parseFloat(rgbBlueMinSlider.value);
    const bMax = parseFloat(rgbBlueMaxSlider.value);

    rgbRedMinVal.textContent = formatValue(rMin);
    rgbRedMaxVal.textContent = formatValue(rMax);
    rgbGreenMinVal.textContent = formatValue(gMin);
    rgbGreenMaxVal.textContent = formatValue(gMax);
    rgbBlueMinVal.textContent = formatValue(bMin);
    rgbBlueMaxVal.textContent = formatValue(bMax);

    currentLayer.setRenderOptions({
        multi: {
            r: { band: rBand, min: Math.min(rMin, rMax), max: Math.max(rMin, rMax) },
            g: { band: gBand, min: Math.min(gMin, gMax), max: Math.max(gMin, gMax) },
            b: { band: bBand, min: Math.min(bMin, bMax), max: Math.max(bMin, bMax) }
        }
    }, fullUpdate);
}

let renderTimer = null;
function scheduleRender() {
    applyRgbComposite(false);
    if (renderTimer) cancelAnimationFrame(renderTimer);
    renderTimer = requestAnimationFrame(() => {
        if (globe.planet.renderer) {
            globe.planet.renderer.requestRedraw();
        }
    });
}

// Band Select Handlers: update slider bounds and re-render
rgbRedBand.addEventListener("change", () => {
    configureChannelSlider(rgbRedMinSlider, rgbRedMaxSlider, rgbRedMinVal, rgbRedMaxVal, parseInt(rgbRedBand.value, 10) - 1);
    applyRgbComposite(true);
});

rgbGreenBand.addEventListener("change", () => {
    configureChannelSlider(rgbGreenMinSlider, rgbGreenMaxSlider, rgbGreenMinVal, rgbGreenMaxVal, parseInt(rgbGreenBand.value, 10) - 1);
    applyRgbComposite(true);
});

rgbBlueBand.addEventListener("change", () => {
    configureChannelSlider(rgbBlueMinSlider, rgbBlueMaxSlider, rgbBlueMinVal, rgbBlueMaxVal, parseInt(rgbBlueBand.value, 10) - 1);
    applyRgbComposite(true);
});

// Sliders: Real-time update on input, full update on change
[
    rgbRedMinSlider, rgbRedMaxSlider,
    rgbGreenMinSlider, rgbGreenMaxSlider,
    rgbBlueMinSlider, rgbBlueMaxSlider
].forEach(slider => {
    slider.addEventListener("input", scheduleRender);
    slider.addEventListener("change", () => applyRgbComposite(true));
});

// Load Layer from scratch
async function loadCOG() {
    try {
        // Render RGB from scratch with native multi-band decoding
        currentLayer = new GeoTIFFLayer("Sentinel RGB Composite", {
            src: COG_URL,
            opacity: 1.0
        });

        globe.planet.addLayer(currentLayer);

        currentMetadata = await currentLayer.whenReady();

        const extent = currentMetadata.extent || currentLayer.getExtent();

        const samples = currentMetadata.samplesPerPixel || 1;
        populateBandSelect(rgbRedBand, samples, 1);
        populateBandSelect(rgbGreenBand, samples, Math.min(2, samples));
        populateBandSelect(rgbBlueBand, samples, Math.min(3, samples));

        configureChannelSlider(rgbRedMinSlider, rgbRedMaxSlider, rgbRedMinVal, rgbRedMaxVal, 0);
        configureChannelSlider(rgbGreenMinSlider, rgbGreenMaxSlider, rgbGreenMinVal, rgbGreenMaxVal, Math.min(1, samples - 1));
        configureChannelSlider(rgbBlueMinSlider, rgbBlueMaxSlider, rgbBlueMinVal, rgbBlueMaxVal, Math.min(2, samples - 1));

        if (extent) {
            globe.planet.flyExtent(extent);
        }
    } catch (err) {
        console.error("Failed to load COG:", err);
    }
}

loadCOG();
