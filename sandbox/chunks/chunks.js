// Run `npm run build:prod` for the chunked library, `npm run build:all` or `npm run dev` for one file.
import { Globe, OpenStreetMap, Bing, Vector, Entity, LonLat, LayerSwitcher } from "../../lib/og.es.js";

const osm = new OpenStreetMap();
const bing = new Bing();

const labels = new Vector("Labels", {
    entities: [
        new Entity({
            name: "Paris",
            lonlat: [2.3522, 48.8566, 0],
            label: {
                text: "Paris",
                size: 24,
                color: "white",
                outlineColor: "rgba(0,0,0,0.6)",
                outline: 2
            }
        })
    ]
});

const globe = new Globe({
    target: "earth",
    name: "Earth",
    layers: [osm, bing, labels]
});

globe.planet.addControl(new LayerSwitcher());

globe.planet.camera.flyLonLat(new LonLat(2.3522, 48.8566, 3000000));

document.getElementById("localNoon").onclick = () => {
    const now = new Date();
    globe.sun.setLocalDateTime(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0)));
};

const shown = new Set();

function showLoadedFiles() {
    const files = performance
        .getEntriesByType("resource")
        .map((e) => new URL(e.name).pathname)
        .filter((p) => p.includes("/lib/") && p.endsWith(".js"));

    const chunks = files.filter((p) => p.includes("/lib/chunks/"));
    document.getElementById("build").textContent = chunks.length
        ? `Chunked build: ${chunks.length} chunks loaded`
        : "One file build";

    const list = document.getElementById("list");
    for (const p of files) {
        if (shown.has(p)) continue;
        shown.add(p);
        const li = document.createElement("li");
        li.textContent = p.slice(p.indexOf("/lib/") + 5);
        list.appendChild(li);
    }
}

showLoadedFiles();
new PerformanceObserver(showLoadedFiles).observe({ type: "resource" });
