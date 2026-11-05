import { Globe, OpenStreetMap, GeoZarrLayer, GlobusRgbTerrain } from "../../lib/og.es.js";

const S2_URL =
    "https://s3.explorer.eopf.copernicus.eu/esa-zarr-sentinel-explorer-fra/tests-output/sentinel-2-l2a/" +
    "S2B_MSIL2A_20260120T125339_N0511_R138_T27VWL_20260120T131151.zarr/measurements/reflectance";

const DATASETS = {
    // Every band array is a band of the render options, numbered from 1
    s2rgb: () => ({
        url: S2_URL,
        bands: ["b04", "b03", "b02"],
        renderOptions: {
            multi: {
                r: { band: 1, min: 0, max: 0.3 },
                g: { band: 2, min: 0, max: 0.3 },
                b: { band: 3, min: 0, max: 0.3 }
            }
        }
    }),
    // The narrow NIR band, b08 is in the 10 m level only, without the coarser levels for the far views
    s2ndvi: () => ({
        url: S2_URL,
        bands: ["b04", "b8a"],
        renderOptions: {
            single: {
                expression: "(b2 - b1) / (b2 + b1)",
                colorScale: "greens",
                domain: [0, 0.8]
            }
        },
        // Range of the sliders, NDVI goes from -1 to 1
        rangeLimits: [-1, 1]
    })
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

const datasetSelect = document.getElementById("datasetSelect");
const opacitySlider = document.getElementById("opacitySlider");
const opacityVal = document.getElementById("opacityVal");
const status = document.getElementById("status");
const rangeRows = document.getElementById("rangeRows");

let currentLayer = null;
let renderOptions = null;

async function loadDataset(id) {
    if (currentLayer) {
        globe.planet.removeLayer(currentLayer);
        currentLayer = null;
    }

    rangeRows.innerHTML = "";
    status.textContent = "Loading…";

    const { rangeLimits, ...dataset } = DATASETS[id]();
    renderOptions = dataset.renderOptions;

    const layer = new GeoZarrLayer(id, {
        ...dataset,
        opacity: parseFloat(opacitySlider.value)
    });

    globe.planet.addLayer(layer);
    currentLayer = layer;

    try {
        const meta = await layer.whenReady();
        if (currentLayer !== layer) return;

        console.log("GeoZarr metadata", meta);
        status.textContent = `${meta.width}×${meta.height}, ${meta.overviewCount} levels, EPSG:${meta.crsCode}`;

        createRangeRows(meta, rangeLimits);
        globe.planet.flyExtent(layer.getExtent());
    } catch (err) {
        status.textContent = `Failed: ${err.message}`;
        console.error("Failed to load GeoZarr:", err);
    }
}

function formatValue(v) {
    if (Math.abs(v) >= 100) return Math.round(v).toString();
    if (Math.abs(v) >= 10) return v.toFixed(1);
    return v.toFixed(2);
}

/**
 * Min and max sliders of a value range [min, max] of the render options, the limits are those of the dataset or
 * the band statistics.
 */
function createRangeRow(title, range, limits) {
    const lo = Math.min(limits[0], range[0]);
    const hi = Math.max(limits[1], range[1]);
    const step = (hi - lo) / 200;

    const row = document.createElement("div");
    row.innerHTML = `<label>${title}</label>`;

    const sliders = range.map((value, i) => {
        const label = document.createElement("label");
        const slider = document.createElement("input");
        Object.assign(slider, { type: "range", min: lo, max: hi, step, value });

        const update = (fullUpdate) => {
            range[i] = parseFloat(slider.value);
            label.textContent = `${i === 0 ? "Min" : "Max"}: ${formatValue(range[i])}`;
            applyRanges(fullUpdate);
        };
        // Visible tiles are styled while dragging, the other cached tiles once the slider is released
        slider.addEventListener("input", () => update(false));
        slider.addEventListener("change", () => update(true));

        label.textContent = `${i === 0 ? "Min" : "Max"}: ${formatValue(value)}`;
        row.append(label, slider);
        return slider;
    });

    rangeRows.appendChild(row);
    return sliders;
}

function bandLimits(meta, band) {
    const stats = meta.bands[band];
    return stats && Number.isFinite(stats.min) && Number.isFinite(stats.max) ? [stats.min, stats.max] : [0, 1];
}

function createRangeRows(meta, rangeLimits) {
    const { multi, single } = renderOptions;

    if (multi) {
        for (const [key, name] of [
            ["r", "Red"],
            ["g", "Green"],
            ["b", "Blue"]
        ]) {
            const channel = multi[key];
            const range = [channel.min, channel.max];
            channel.range = range;
            createRangeRow(`${name} (band ${channel.band})`, range, rangeLimits ?? bandLimits(meta, channel.band));
        }
    } else if (single) {
        const title = single.expression ? single.expression : `Band ${single.band}`;
        createRangeRow(title, single.domain, rangeLimits ?? bandLimits(meta, single.band));
    }
}

function applyRanges(fullUpdate) {
    if (!currentLayer) return;

    const { multi, single } = renderOptions;

    if (multi) {
        const channel = ({ band, range }) => ({ band, min: Math.min(...range), max: Math.max(...range) });
        currentLayer.setRenderOptions(
            { multi: { r: channel(multi.r), g: channel(multi.g), b: channel(multi.b) } },
            fullUpdate
        );
    } else if (single) {
        const [a, b] = single.domain;
        currentLayer.setRenderOptions({ single: { ...single, domain: [Math.min(a, b), Math.max(a, b)] } }, fullUpdate);
    }
}

datasetSelect.addEventListener("change", () => loadDataset(datasetSelect.value));

opacitySlider.addEventListener("input", () => {
    const opacity = parseFloat(opacitySlider.value);
    opacityVal.textContent = `${Math.round(opacity * 100)}%`;
    if (currentLayer) {
        currentLayer.opacity = opacity;
    }
});

window.globe = globe;

loadDataset(datasetSelect.value);
