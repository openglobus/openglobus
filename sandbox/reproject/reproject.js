import {
    Globe,
    OpenStreetMap,
    GeoTIFFLayer,
    GlobusRgbTerrain
} from "../../lib/og.es.js";

window.proj4 = proj4;

proj4.defs(
    "EPSG:2193",
    "+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +x_0=1600000 +y_0=10000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
);

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
const btnFly = document.getElementById("btnFly");
const metaInfo = document.getElementById("metaInfo");

async function loadTiff() {
    if (currentLayer) {
        globe.planet.removeLayer(currentLayer);
        currentLayer = null;
    }

    try {
        const opacity = parseFloat(opacitySlider.value);
        const layer = new GeoTIFFLayer("GeoTIFF Layer", {
            crs: 2193,
            src: "https://tile-service-raster.s3.us-east-1.amazonaws.com/cogs/as-raster-tile/HM_COG.tif",
            opacity
        });

        globe.planet.addLayer(layer);
        currentLayer = layer;

        const meta = await layer.whenReady();
        const ext = layer.getExtent();

        metaInfo.textContent = [
            `File: HM_COG.tif`,
            `CRS: EPSG:${layer.reader.crsCode || 2193}`,
            `Size: ${meta.width} x ${meta.height}`,
            `Bands: ${meta.samplesPerPixel}`,
            `Overviews: ${meta.overviewCount}`,
            `Extent:`,
            `  SW: [${ext.southWest.lon.toFixed(3)}, ${ext.southWest.lat.toFixed(3)}]`,
            `  NE: [${ext.northEast.lon.toFixed(3)}, ${ext.northEast.lat.toFixed(3)}]`
        ].join("\n");

        flyToLayer();
    } catch (err) {
        console.error("Failed to load GeoTIFF:", err);
        metaInfo.textContent = `Error: ${err.message || err}`;
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

btnFly.addEventListener("click", flyToLayer);

loadTiff();
