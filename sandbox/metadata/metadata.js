import { Globe, OpenStreetMap, GeoTIFFLayer } from "../../lib/og.es.js";

const DATASETS = {
    sentinel2:
        "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/36/Q/WD/2020/7/S2A_36QWD_20200701_0_L2A/TCI.tif",
    planet: "https://storage.googleapis.com/pdd-stac/disasters/hurricane-harvey/0831/20170831_172754_101c_3B_AnalyticMS.tif",
    solar: "https://eox-gtif-public.s3.eu-central-1.amazonaws.com/DHI/v2/SolarPowerPotential_Annual_COG_clipped_3857_fixed.tif"
};

let currentLayer = null;

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
const datasetSelect = document.getElementById("datasetSelect");
const metaBox = document.getElementById("metaBox");

async function inspectMetadata(url) {
    if (!url) return;

    if (currentLayer) {
        globe.planet.removeLayer(currentLayer);
        currentLayer = null;
    }

    metaBox.textContent = `Fetching metadata for:\n${url}\n\nPlease wait...`;

    try {
        const layer = new GeoTIFFLayer("Inspected GeoTIFF", {
            src: url,
            opacity: 1.0
        });

        globe.planet.addLayer(layer);
        currentLayer = layer;

        const meta = await layer.whenReady();
        const extent = meta?.extent || layer.getExtent();

        const bandDetails = Object.entries(meta.bands || {})
            .map(
                ([idx, stat]) =>
                    `  Band ${idx}: min = ${Number(stat.min).toFixed(2)}, max = ${Number(stat.max).toFixed(2)}`
            )
            .join("\n");

        metaBox.textContent = [
            `=== IMAGE INFORMATION ===`,
            `Source: ${url.split("/").pop()}`,
            `Dimensions: ${meta.width} x ${meta.height} px`,
            `Bands (Samples): ${meta.samplesPerPixel}`,
            `Overviews / Pyramids: ${meta.overviewCount ?? 0}`,
            `Tiled Storage: ${meta.isTiled ? "Yes" : "No"}`,
            `NoData Value: ${meta.noData !== null && meta.noData !== undefined ? meta.noData : "None"}`,
            ``,
            `=== SPATIAL REFERENCE ===`,
            `CRS: ${meta.crsCode ? `EPSG:${meta.crsCode}` : "EPSG:4326"}`,
            extent
                ? `WGS84 Extent:\n  SW: [${extent.southWest.lon.toFixed(4)}, ${extent.southWest.lat.toFixed(4)}]\n  NE: [${extent.northEast.lon.toFixed(4)}, ${extent.northEast.lat.toFixed(4)}]`
                : "Extent: Unknown",
            ``,
            `=== BAND STATISTICS ===`,
            bandDetails || "  No band statistics found"
        ].join("\n");

        if (extent) {
            globe.planet.flyExtent(extent);
        }
    } catch (err) {
        console.error("Failed to read GeoTIFF metadata:", err);
        metaBox.textContent = `Error reading metadata:\n${err.message || err}`;
    }
}

// Event Listeners
datasetSelect.addEventListener("change", (e) => {
    const val = e.target.value;
    inspectMetadata(DATASETS[val]);
});

// Initial inspection
inspectMetadata(DATASETS.sentinel2);
