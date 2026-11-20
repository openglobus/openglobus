// Run `npm run build:prod` for the chunked library, `npm run build:all` or `npm run dev` for one file.
import { Renderer, SimpleNavigation, Vec3, scene } from "../../lib/og.es.js";

const renderer = new Renderer("frame", {
    msaa: 8,
    controls: [new SimpleNavigation({ speed: 0.01 })],
    autoActivate: true
});

renderer.addScene(new scene.Axes());

renderer.activeCamera.set(new Vec3(150, 120, 200), new Vec3(0, 0, 0));
renderer.activeCamera.update();

window.renderer = renderer;

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
