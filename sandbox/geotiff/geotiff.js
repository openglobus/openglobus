import {
    Globe,
    OpenStreetMap,
    GeoTIFFLayer,
    GlobusRgbTerrain
} from "../../lib/og.es.js";

// const COG_URL = "./cogtif.tif";
const COG_URL = "https://eox-gtif-public.s3.eu-central-1.amazonaws.com/DHI/v2/SolarPowerPotential_Annual_COG_clipped_3857_fixed.tif";

let currentLayer = null;

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

const colorScaleSelect = document.getElementById("colorScaleSelect");
const opacitySlider = document.getElementById("opacitySlider");
const opacityVal = document.getElementById("opacityVal");

async function loadTiff(src) {
    if (currentLayer) {
        globe.planet.removeLayer(currentLayer);
        currentLayer = null;
    }

    try {
        const opacity = parseFloat(opacitySlider.value);
        const layer = new GeoTIFFLayer("GeoTIFF Layer", {
            src,
            opacity,
            renderOptions: {
                nodata: 0.00010976348130498081,
                single: {
                    band: 1,
                    colorScale: colorScaleSelect.value
                }
            }
        });

        globe.planet.addLayer(layer);
        currentLayer = layer;

        await layer.whenReady();
        flyToLayer();
    } catch (err) {
        console.error("Failed to load GeoTIFF:", err);
    }
}

function flyToLayer() {
    if (!currentLayer) return;
    const extent = currentLayer.getExtent();
    if (extent) {
        globe.planet.flyExtent(extent);
    }
}

colorScaleSelect.addEventListener("change", () => {
    if (currentLayer) {
        currentLayer.setRenderOptions({
            single: {
                band: 1,
                colorScale: colorScaleSelect.value
            }
        });
    }
});

opacitySlider.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    opacityVal.textContent = `${Math.round(val * 100)}%`;
    if (currentLayer) {
        currentLayer.opacity = val;
    }
});

// Load the single-band COG
loadTiff(COG_URL);
