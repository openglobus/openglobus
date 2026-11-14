//
// Memory report of a planet: what the segments, the terrain caches and the GPU objects hold right now,
// and what the proposals P4 and P5b would free. See terrainMemory.test.js for the per segment numbers,
// memoryReport.test.js tests it.
//
// On a page:    import { attachMemoryHud } from "../../tests/memory/memoryReport.js"; attachMemoryHud(globe);
// In a console: const planet = __globus__.planet; (await import("/tests/memory/memoryReport.js")).collectMemoryReport(planet)
//

const MB = 1024 * 1024;

const BYTES_PER_PIXEL = {
    RGBA8: 4,
    RGBA16F: 8,
    RGBA32F: 16,
    R16F: 2,
    R32F: 4,
    RGBA4: 2,
    DEPTH_COMPONENT16: 2,
    DEPTH_COMPONENT24: 4,
    DEPTH_COMPONENT32F: 4
};

// A layer tile texture is not measurable in WebGL: 256 x 256 RGBA with mipmaps is taken
const LAYER_TEXTURE_BYTES = Math.round(256 * 256 * 4 * 1.333);

const MESH_ARRAYS = [
    "plainVertices",
    "plainVerticesHigh",
    "plainVerticesLow",
    "plainNormals",
    "terrainVertices",
    "terrainVerticesHigh",
    "terrainVerticesLow",
    "renderVertices",
    "renderVerticesHigh",
    "renderVerticesLow"
];

// gl.UNSIGNED_SHORT
const UNSIGNED_SHORT = 0x1403;

function bufferBytes(buffer, bytesPerItem = 4) {
    return buffer ? buffer.numItems * (buffer.itemSize || 1) * bytesPerItem : 0;
}

// Element array buffers keep their index type, see Handler.createElementArrayBuffer
const indexBytes = (buffer) => (buffer.type === UNSIGNED_SHORT ? 2 : 4);

function centerIndexesCount(log2) {
    const d = (1 << log2) + 1;
    return log2 ? (d - 3) * (2 * d - 2) + 2 : 0;
}

function framebufferBytes(fb) {
    const pixels = fb._width * fb._height;
    let bytes = 0;

    if (fb.renderbuffers) {
        // Multisample
        const samples = Math.max(fb._msaa || 1, 1);
        bytes += pixels * samples * fb.renderbuffers.length * (BYTES_PER_PIXEL[fb._internalFormat] || 4);
        bytes += pixels * samples * 4;
    } else {
        const targets = fb._targets || [];
        for (let i = 0; i < targets.length; i++) {
            bytes += pixels * (BYTES_PER_PIXEL[String(targets[i].internalFormat).toUpperCase()] || 4);
        }
        if (fb._useDepth) {
            bytes += pixels * 4;
        }
    }

    return bytes;
}

function collectFramebuffers(renderer) {
    const seen = new Set();
    let bytes = 0;

    const scan = (obj) => {
        if (!obj) return;
        for (const key of Object.keys(obj)) {
            const v = obj[key];
            if (v && typeof v === "object" && "_fbo" in v && "_width" in v && !seen.has(v)) {
                seen.add(v);
                bytes += framebufferBytes(v);
            }
        }
    };

    scan(renderer);
    scan(renderer.deferredShadingPass);
    scan(renderer.transparencyPass);

    return { count: seen.size, bytes };
}

/**
 * Bytes held by the planet now. CPU numbers are exact (typed arrays, every ArrayBuffer once),
 * GPU numbers are estimates by the object sizes.
 */
export function collectMemoryReport(planet) {
    const qts = planet.quadTreeStrategy,
        terrain = planet.terrain,
        renderer = planet.renderer,
        nmc = planet._normalMapCreator;

    const seenBuffers = new Set(),
        seenTextures = new Set();

    const take = (arr) => {
        if (!arr || !arr.buffer || seenBuffers.has(arr.buffer)) return 0;
        seenBuffers.add(arr.buffer);
        return arr.buffer.byteLength;
    };

    const nodes = { total: 0, terrain: 0, noTerrain: 0, rendered: qts._renderedNodes.length },
        cpu = { mesh: 0, normalMapVertices: 0, normalMapNormals: 0, elevationData: 0 },
        gpu = { vertexBuffers: 0, normalMapTextures: 0, layerTextures: 0, indexCache: 0, framebuffers: 0 },
        whatIf = { P4: 0, P5b: 0 };

    const normalMapTextureBytes = nmc.width * nmc.height * 4;

    let layerTextures = 0;

    const visit = (node) => {
        const seg = node.segment;
        if (!seg) return;

        nodes.total++;

        for (let i = 0; i < MESH_ARRAYS.length; i++) {
            cpu.mesh += take(seg[MESH_ARRAYS[i]]);
        }

        const nmv = take(seg.normalMapVertices),
            nmn = take(seg.normalMapNormals);

        cpu.normalMapVertices += nmv;
        cpu.normalMapNormals += nmn;
        cpu.elevationData += take(seg.elevationData);

        if (seg.terrainExists) {
            nodes.terrain++;
        } else if (seg.plainReady) {
            nodes.noTerrain++;
        }

        gpu.vertexBuffers +=
            bufferBytes(seg.vertexPositionBufferHigh) +
            bufferBytes(seg.vertexPositionBufferLow) +
            bufferBytes(seg.skirtVertexPositionBufferHigh) +
            bufferBytes(seg.skirtVertexPositionBufferLow) +
            (seg.skirtIndexBuffer ? bufferBytes(seg.skirtIndexBuffer, indexBytes(seg.skirtIndexBuffer)) : 0);

        if (seg.normalMapTexturePtr && !seenTextures.has(seg.normalMapTexturePtr)) {
            seenTextures.add(seg.normalMapTexturePtr);
            gpu.normalMapTextures += normalMapTextureBytes;
        }

        const materials = seg.materials;
        if (materials) {
            for (const id in materials) {
                const m = materials[id],
                    t = m && m.textureExists && m.texture;
                if (t && !t.default && !seenTextures.has(t)) {
                    seenTextures.add(t);
                    layerTextures++;
                }
            }
        }
    };

    for (let i = 0; i < qts._quadTreeList.length; i++) {
        qts._quadTreeList[i].traverseTree(visit);
    }

    gpu.layerTextures = layerTextures * LAYER_TEXTURE_BYTES;

    //
    // Index buffers
    //
    const indexCache = { buffers: 0, bytes: 0, borderBytes: 0 },
        ic = planet._indexesCache;

    // One shared center buffer per grid size in use
    let sharedCenters = 0;

    for (let i = 0; i < ic.length; i++) {
        const center = centerIndexesCount(i),
            before = indexCache.buffers;
        let bytes = 4;
        for (let j = 0; j < ic[i].length; j++) {
            for (let k = 0; k < ic[i][j].length; k++) {
                for (let m = 0; m < ic[i][j][k].length; m++) {
                    const row = ic[i][j][k][m];
                    for (let q = 0; q < row.length; q++) {
                        const b = row[q] && row[q].buffer;
                        if (b) {
                            bytes = indexBytes(b);
                            indexCache.buffers++;
                            indexCache.bytes += b.numItems * bytes;
                            indexCache.borderBytes += (b.numItems - center) * bytes;
                        }
                    }
                }
            }
        }
        if (indexCache.buffers > before) {
            sharedCenters += center * bytes;
        }
    }

    gpu.indexCache = indexCache.bytes;
    whatIf.P5b = indexCache.bytes - indexCache.borderBytes - sharedCenters;

    //
    // Terrain caches
    //
    const elevationCache = { tiles: 0, buffers: 0, bytes: 0 },
        cacheBuffers = new Set(),
        imageBytes = (terrain._imageSize || 0) ** 2 * 4,
        tileBytes = (terrain.plainGridSize + 1) ** 2 * 4;

    let lazyBytes = 0;

    if (terrain._elevationCache) {
        for (const key in terrain._elevationCache) {
            const h = terrain._elevationCache[key].heights;
            elevationCache.tiles++;
            if (h && h.buffer && !cacheBuffers.has(h.buffer)) {
                cacheBuffers.add(h.buffer);
                elevationCache.bytes += h.buffer.byteLength;
                lazyBytes += h.buffer.byteLength > tileBytes ? tileBytes + imageBytes : h.buffer.byteLength;
            }
        }
    }

    elevationCache.buffers = cacheBuffers.size;
    cpu.elevationCache = elevationCache.bytes;
    cpu.imageDataCache = terrain._imageDataCache ? terrain._imageDataCache.size * imageBytes : 0;
    whatIf.P4 = Math.max(elevationCache.bytes - lazyBytes, 0);

    const framebuffers = collectFramebuffers(renderer);
    gpu.framebuffers = framebuffers.bytes;

    const sum = (obj) => Object.values(obj).reduce((a, b) => a + b, 0),
        canvas = renderer.handler.canvas;

    return {
        time: new Date().toISOString(),
        canvas: `${canvas.width}x${canvas.height}`,
        pixelRatio: renderer.handler.pixelRatio,
        nodes: { ...nodes, createdSinceMemClear: planet._createdNodesCount },
        cpu: { ...cpu, total: sum(cpu) },
        gpu: { ...gpu, total: sum(gpu) },
        indexCache,
        elevationCache,
        layerTextures,
        framebuffers: framebuffers.count,
        queues: {
            terrainWorker: planet._terrainWorker.pendingQueue.length,
            plainWorker: planet._plainSegmentWorker.pendingQueue.length,
            normalMaps: nmc.queueSize
        },
        whatIf,
        jsHeap: performance.memory ? performance.memory.usedJSHeapSize : 0
    };
}

/**
 * Emulations of the proposals without the engine changes, to compare on the device:
 *   ecache=MB   - P4 (bound only): oldest loaded tiles leave the elevation cache above the limit.
 *                 A level tile asked after that is loaded by its own url, as after memClear.
 * @returns {string[]} - Active experiments.
 */
export function applyExperiments(planet, params = new URLSearchParams(location.search)) {
    const active = [];

    const ecache = Number(params.get("ecache"));
    if (ecache > 0) {
        active.push(`ecache=${ecache}`);

        setInterval(() => {
            const cache = planet.terrain && planet.terrain._elevationCache;
            if (!cache) return;

            // Loaded tiles in the order they came, with the level tiles cut from them
            const groups = new Map();
            let bytes = 0;
            for (const key in cache) {
                const h = cache[key].heights;
                if (h && h.buffer) {
                    let g = groups.get(h.buffer);
                    if (!g) {
                        groups.set(h.buffer, (g = []));
                        bytes += h.buffer.byteLength;
                    }
                    g.push(key);
                }
            }

            for (const [buffer, keys] of groups) {
                if (bytes <= ecache * MB) break;
                for (let i = 0; i < keys.length; i++) {
                    delete cache[keys[i]];
                }
                bytes -= buffer.byteLength;
            }
        }, 500);
    }

    return active;
}

const STORAGE_KEY = "og_memory_report";

function readStored() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (e) {
        return null;
    }
}

function writeStored(value) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (e) {}
}

const mb = (bytes) => String(Math.round(bytes / MB)).padStart(5);

function formatReport(r, peak) {
    const line = (name, bytes, note = "") => `  ${name.padEnd(20)}${mb(bytes)}${note ? "  " + note : ""}`;
    return [
        `${r.time.slice(11, 19)}  canvas ${r.canvas}  dpr ${r.pixelRatio.toFixed(2)}`,
        `nodes ${r.nodes.total}: terrain ${r.nodes.terrain}, no terrain ${r.nodes.noTerrain}, rendered ${r.nodes.rendered}`,
        `created ${r.nodes.createdSinceMemClear}  memClear ${r.memClears}  queues t${r.queues.terrainWorker} p${r.queues.plainWorker} n${r.queues.normalMaps}`,
        `CPU arrays, MB        ${mb(r.cpu.total)}  peak ${mb(peak.cpu).trim()}`,
        line("normalMapVertices", r.cpu.normalMapVertices),
        line("normalMapNormals", r.cpu.normalMapNormals),
        line("mesh", r.cpu.mesh),
        line("elevationData", r.cpu.elevationData),
        line(
            "elevation cache",
            r.cpu.elevationCache,
            `${r.elevationCache.buffers} loaded, ${r.elevationCache.tiles} tiles`
        ),
        line("image data cache", r.cpu.imageDataCache),
        `GPU estimate, MB      ${mb(r.gpu.total)}  peak ${mb(peak.gpu).trim()}`,
        line("framebuffers", r.gpu.framebuffers, `${r.framebuffers}`),
        line("layer textures", r.gpu.layerTextures, `${r.layerTextures} x 256px`),
        line("vertex buffers", r.gpu.vertexBuffers),
        line("normal map textures", r.gpu.normalMapTextures),
        line("index cache", r.gpu.indexCache, `${r.indexCache.buffers} buffers, cleared ${r.indexCacheClears}`),
        `what-if, MB: P4 -${mb(r.whatIf.P4).trim()}  P5b -${mb(r.whatIf.P5b).trim()}`,
        r.jsHeap ? `JS heap ${mb(r.jsHeap).trim()} MB` : ""
    ]
        .filter(Boolean)
        .join("\n");
}

/**
 * Shows the report over the page and keeps the last one in localStorage: a tab the system has killed
 * shows it after the reload.
 */
export function attachMemoryHud(globe, { interval = 1000, experiments = [] } = {}) {
    const planet = globe.planet;

    const el = document.createElement("pre");
    el.style.cssText =
        "position:absolute;left:4px;top:4px;margin:0;padding:6px 8px;z-index:10000;font:10px/1.25 monospace;" +
        "color:#d8ffd8;background:rgba(0,0,0,0.72);border-radius:4px;white-space:pre;max-width:96vw;overflow:auto;" +
        "max-height:92vh";
    document.body.appendChild(el);

    let collapsed = false;
    el.addEventListener("click", () => {
        collapsed = !collapsed;
    });

    const previous = readStored(),
        crashed = previous && previous.running ? previous : null;

    const peak = { cpu: 0, gpu: 0, report: null };

    let memClears = 0,
        indexCacheClears = 0;

    const memClear = planet.memClear;
    planet.memClear = function (...args) {
        memClears++;
        return memClear.apply(this, args);
    };

    const clearIndexesCache = planet._clearIndexesCache;
    planet._clearIndexesCache = function (...args) {
        indexCacheClears++;
        return clearIndexesCache.apply(this, args);
    };

    let last = null;

    const tick = () => {
        if (!planet.renderer || !planet.quadTreeStrategy || !planet._indexesCache.length) {
            return;
        }

        const r = collectMemoryReport(planet);
        r.memClears = memClears;
        r.indexCacheClears = indexCacheClears;
        r.experiments = experiments;
        last = r;

        peak.gpu = Math.max(peak.gpu, r.gpu.total);
        if (r.cpu.total >= peak.cpu) {
            peak.cpu = r.cpu.total;
            peak.report = r;
        }

        writeStored({ running: true, last: r, peak });

        const head = `OG memory${experiments.length ? "  [" + experiments.join(" ") + "]" : ""}  (tap to fold)`;

        if (collapsed) {
            el.textContent = `${head}\nCPU ${mb(r.cpu.total).trim()} MB  GPU ${mb(r.gpu.total).trim()} MB`;
            return;
        }

        let text = `${head}\n${formatReport(r, peak)}`;

        if (crashed) {
            const p = crashed.peak || { cpu: 0, gpu: 0 },
                lr = crashed.last;
            text +=
                `\n\nPREVIOUS SESSION WAS NOT CLOSED (killed tab?)` +
                `${lr.experiments && lr.experiments.length ? "  [" + lr.experiments.join(" ") + "]" : ""}\n` +
                formatReport({ memClears: 0, indexCacheClears: 0, ...lr }, p);
        }

        el.textContent = text;
    };

    const timer = setInterval(tick, interval);

    window.addEventListener("pagehide", () => {
        writeStored({ running: false, last, peak });
    });

    return {
        get last() {
            return last;
        },
        get peak() {
            return peak;
        },
        previous: crashed,
        destroy() {
            clearInterval(timer);
            el.remove();
        }
    };
}
