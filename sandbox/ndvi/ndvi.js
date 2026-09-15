import {
    Globe,
    OpenStreetMap,
    GeoTIFFLayer
} from "../../lib/og.es.js";

const COG_URL = "https://storage.googleapis.com/pdd-stac/disasters/hurricane-harvey/0831/20170831_172754_101c_3B_AnalyticMS.tif";
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
const colorScaleSelect = document.getElementById("colorScaleSelect");
const domainMinInput = document.getElementById("domainMin");
const domainMaxInput = document.getElementById("domainMax");
const opacitySlider = document.getElementById("opacitySlider");
const opacityVal = document.getElementById("opacityVal");

function applyNdvi(fullUpdate = false) {
    if (!currentLayer) return;

    const colorScale = colorScaleSelect.value;
    const dMin = parseFloat(domainMinInput.value);
    const dMax = parseFloat(domainMaxInput.value);

    const min = Number.isFinite(dMin) ? dMin : -0.2;
    const max = Number.isFinite(dMax) ? dMax : 0.8;

    currentLayer.setRenderOptions({
        single: {
            expression: "(b4 - b3) / (b4 + b3)",
            colorScale,
            domain: [min, max]
        }
    }, fullUpdate);
}

let renderTimer = null;
function scheduleRender() {
    applyNdvi(false);
    if (renderTimer) cancelAnimationFrame(renderTimer);
    renderTimer = requestAnimationFrame(() => {
        if (globe.planet.renderer) {
            globe.planet.renderer.requestRedraw();
        }
    });
}

// Palette changed (instant in-memory re-rendering)
colorScaleSelect.addEventListener("change", () => applyNdvi(false));

// Domain min/max: fast update on input, full update on change
domainMinInput.addEventListener("input", scheduleRender);
domainMaxInput.addEventListener("input", scheduleRender);
domainMinInput.addEventListener("change", () => applyNdvi(true));
domainMaxInput.addEventListener("change", () => applyNdvi(true));

// Opacity
opacitySlider.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    opacityVal.textContent = `${Math.round(val * 100)}%`;
    if (currentLayer) {
        currentLayer.opacity = val;
    }
});

// Load Layer
async function loadCOG() {
    try {
        currentLayer = new GeoTIFFLayer("NDVI Layer", {
            src: COG_URL,
            opacity: 1.0,
            renderOptions: {
                single: {
                    expression: "(b4 - b3) / (b4 + b3)",
                    colorScale: "earth",
                    domain: [-0.2, 0.8]
                }
            }
        });

        globe.planet.addLayer(currentLayer);

        currentMetadata = await currentLayer.whenReady();

        const extent = currentMetadata.extent || currentLayer.getExtent();

        applyNdvi(false);

        if (extent) {
            globe.planet.flyExtent(extent);
        }
    } catch (err) {
        console.error("Failed to load COG:", err);
    }
}

loadCOG();
