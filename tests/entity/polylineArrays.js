import { Vec3 } from "../../src/math/Vec3";
import { LonLat } from "../../src/LonLat";
import { wgs84 } from "../../src/ellipsoid/wgs84";
import { srgbToLinear } from "../../src/utils/colorSpace";
import { EntityCollection } from "../../src/entity/EntityCollection";
import { PolylineBatchRenderer } from "../../src/entity/polyline/PolylineBatchRenderer";

const POSITION_EPS = 1e-2;
const VALUE_EPS = 1e-6;

export function createScene() {
    return { renderer: null, ellipsoid: wgs84 };
}

export function createCollection(bound = true) {
    const entityCollection = new EntityCollection();
    const handler = entityCollection.polylineHandler;
    if (bound) {
        handler.bindScene(createScene());
    }
    return { entityCollection, handler };
}

export function point(lon, lat, height = 100) {
    return wgs84.lonLatToCartesian(new LonLat(lon, lat, height));
}

export function track(lon, lat, count, step = 0.001, height = 100) {
    const res = [];
    for (let i = 0; i < count; i++) {
        res.push(point(lon + i * step, lat + i * step * 0.5, height + i));
    }
    return res;
}

export function lonLatTrack(lon, lat, count, step = 0.001, height = 100) {
    const res = [];
    for (let i = 0; i < count; i++) {
        res.push(new LonLat(lon + i * step, lat + i * step * 0.5, height + i));
    }
    return res;
}

export function getRenderers(handler) {
    return [
        handler._opaqueRenderer,
        handler._transparentRenderer,
        handler._opaqueTexRenderer,
        handler._transparentTexRenderer,
        handler._timedRenderer,
        handler._timedTexRenderer
    ].filter(Boolean);
}

function fail(message) {
    throw new Error(message);
}

function toArray(a) {
    return a ? Array.from(a) : [];
}

function decodeVertex(r, v) {
    const h = r._verticesHigh,
        l = r._verticesLow,
        k = v * 3;
    const c = r._handler ? r._handler._relativeCenter : new Vec3();
    return new Vec3(h[k] + l[k] + c.x, h[k + 1] + l[k + 1] + c.y, h[k + 2] + l[k + 2] + c.z);
}

function mirror(p0, p1) {
    return new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
}

function expectVec(actual, expected, where) {
    if (actual.distance(expected) > POSITION_EPS) {
        fail(`${where}: expected ${expected.toString()} got ${actual.toString()}`);
    }
}

function expectValues(arr, offset, expected, where) {
    for (let i = 0; i < expected.length; i++) {
        const a = arr[offset + i];
        if (!(Math.abs(a - expected[i]) <= VALUE_EPS)) {
            fail(`${where}[${i}]: expected ${expected[i]} got ${a}`);
        }
    }
}

function expectLength(arr, length, name) {
    const len = arr ? arr.length : 0;
    if (len !== length) {
        fail(`${name}.length: expected ${length} got ${len}`);
    }
}

function nonEmptySegments(r) {
    const res = [];
    let base = 0;
    for (let s = 0; s < r._path3v.length; s++) {
        const path = r._path3v[s];
        if (!path || path.length === 0) continue;
        res.push({ s, path, base });
        base += (path.length + 2) * 4;
    }
    return { segments: res, vertexCount: base };
}

function resolveColors(r, s, n) {
    const pathColors = r._pathColors[s] || [];
    const opacity = r._segmentOpacity[s] ?? 1.0;
    const res = [];
    let color = r._defaultColor;
    if (pathColors[0]) color = pathColors[0];
    const lead = color;
    for (let i = 0; i < n; i++) {
        if (pathColors[i]) color = pathColors[i];
        res.push(color);
    }
    const toLinear = (c) => [
        srgbToLinear(c[0]),
        srgbToLinear(c[1]),
        srgbToLinear(c[2]),
        (c[3] != undefined ? c[3] : 1.0) * opacity
    ];
    return { lead: toLinear(lead), points: res.map(toLinear), tail: toLinear(res[n - 1]) };
}

function resolvePicking(r, s, n) {
    const picking = r._pathPickingColors[s] || [];
    const res = [];
    let color = picking[0] ? picking[0] : r._pickingColor;
    const lead = color;
    for (let i = 0; i < n; i++) {
        if (picking[i]) color = picking[i];
        res.push(color);
    }
    const rgb = (c) => [c[0], c[1], c[2]];
    return { lead: rgb(lead), points: res.map(rgb), tail: rgb(res[n - 1]) };
}

function resolveTimes(r, s, n) {
    const times = r._pathTimes[s] || [];
    const defined = (t) => t !== undefined && Number.isFinite(t);
    let t = times.slice(0, n).find(defined);
    if (t === undefined) t = times.find(defined);
    const res = [];
    for (let i = 0; i < n; i++) {
        if (defined(times[i])) t = times[i];
        res.push(t);
    }
    return res;
}

function absoluteTime(r, k) {
    return r._timesArr[k] + r._timeOrigin;
}

function quad(values) {
    return [].concat(values, values, values, values);
}

function stripTriangles(indexes) {
    const res = [];
    for (let k = 2; k < indexes.length; k++) {
        const a = indexes[k - 2],
            b = indexes[k - 1],
            c = indexes[k];
        if (a === b || b === c || a === c) continue;
        res.push([a, b, c].sort((x, y) => x - y).join(","));
    }
    return res.sort();
}

function expectedTriangles(r, segments) {
    const res = [];
    for (const { s, path, base } of segments) {
        const n = path.length;
        const first = base;
        const last = base + 4 * n - 1;
        for (let k = first; k + 2 <= last; k++) {
            res.push([k, k + 1, k + 2].join(","));
        }
        if (r._pathClosed[s] === true) {
            res.push([first, last - 1, last].sort((x, y) => x - y).join(","));
            res.push([first, first + 1, last].sort((x, y) => x - y).join(","));
        }
    }
    return res.sort();
}

/**
 * Checks every attribute array of the batch renderer against the layout the
 * shaders expect, derived from the renderer's own path/color/thickness state.
 */
export function checkRenderer(r, name = "renderer") {
    if (!r._scene) return;

    const { segments, vertexCount: N } = nonEmptySegments(r);
    const C = N > 0 ? N - 4 : 0;

    expectLength(r._verticesHigh, N * 3, `${name}._verticesHigh`);
    expectLength(r._verticesLow, N * 3, `${name}._verticesLow`);
    expectLength(r._orders, N, `${name}._orders`);
    expectLength(r._colors, C * 4, `${name}._colors`);
    expectLength(r._thicknessArr, C, `${name}._thicknessArr`);
    expectLength(r._pickingColors, C * 3, `${name}._pickingColors`);

    if (r.isTextured) {
        expectLength(r._pathTexParamArr, C * 3, `${name}._pathTexParamArr`);
        expectLength(r._boundingSphereArr, C * 4, `${name}._boundingSphereArr`);
        expectLength(r._texCoordArr, C * 4, `${name}._texCoordArr`);
        expectLength(r._pathPhaseArr, C, `${name}._pathPhaseArr`);
    }

    for (let v = 0; v < N; v += 4) {
        expectValues(r._orders, v, [1, -1, 2, -2], `${name}._orders@${v}`);
    }

    if (r.isTimed) {
        expectLength(r._timesArr, C, `${name}._timesArr`);
    } else {
        expectLength(r._timesArr, 0, `${name}._timesArr of an untimed renderer`);
    }

    expectLength(r._pathLengths, r._path3v.length + 1, `${name}._pathLengths`);
    if (r._pathLengths[0] !== 0) fail(`${name}._pathLengths[0] is ${r._pathLengths[0]}`);
    for (let s = 0; s < r._path3v.length; s++) {
        const len = r._path3v[s] ? r._path3v[s].length : 0;
        if (r._pathLengths[s + 1] - r._pathLengths[s] !== len) {
            fail(`${name}._pathLengths[${s + 1}] does not match segment ${s} length ${len}`);
        }
        if (r._pathLonLat[s] && r._pathLonLat[s].length !== len) {
            fail(`${name}._pathLonLat[${s}].length ${r._pathLonLat[s].length} != ${len}`);
        }
        if (r._pathLonLatMerc[s] && r._pathLonLatMerc[s].length !== len) {
            fail(`${name}._pathLonLatMerc[${s}].length ${r._pathLonLatMerc[s].length} != ${len}`);
        }
        for (let i = 0; r._pathLonLat[s] && i < len; i++) {
            const expected = wgs84.lonLatToCartesian(r._pathLonLat[s][i]);
            expectVec(r._path3v[s][i], expected, `${name}._pathLonLat[${s}][${i}]`);
        }
    }

    for (let si = 0; si < segments.length; si++) {
        const { s, path, base } = segments[si];
        const n = path.length;
        const closed = r._pathClosed[s] === true;
        const where = `${name} segment ${s}`;

        const lead = closed ? path[n - 1] : mirror(path[0], path[1] || path[0]);
        const tail = closed ? path[0] : mirror(path[n - 1], path[n - 2] || path[n - 1]);

        for (let q = 0; q < 4; q++) {
            expectVec(decodeVertex(r, base + q), lead, `${where} lead pad vertex ${q}`);
            expectVec(decodeVertex(r, base + 4 + 4 * n + q), tail, `${where} tail pad vertex ${q}`);
        }
        for (let i = 0; i < n; i++) {
            for (let q = 0; q < 4; q++) {
                expectVec(decodeVertex(r, base + 4 + 4 * i + q), path[i], `${where} point ${i} vertex ${q}`);
            }
        }

        const colors = resolveColors(r, s, n);
        const picking = resolvePicking(r, s, n);
        const thickness = r._resolveSegmentThickness(s);

        const writeGroup = (c, rgba, pick, label) => {
            expectValues(r._colors, c * 4, quad(rgba), `${where} ${label} color`);
            expectValues(r._pickingColors, c * 3, quad(pick), `${where} ${label} picking`);
            expectValues(
                r._thicknessArr,
                c,
                [thickness, thickness, thickness, thickness],
                `${where} ${label} thickness`
            );
        };

        if (si > 0) {
            writeGroup(base - 4, colors.lead, picking.lead, "lead pad");
        }
        for (let i = 0; i < n; i++) {
            writeGroup(base + 4 * i, colors.points[i], picking.points[i], `point ${i}`);
        }
        writeGroup(base + 4 * n, colors.tail, picking.tail, "tail pad");

        if (r.isTimed) {
            const times = resolveTimes(r, s, n);
            if (times.some((t) => t !== undefined)) {
                const expectTime = (c, t, label) => {
                    for (let q = 0; q < 4; q++) {
                        const actual = absoluteTime(r, c + q);
                        if (Math.abs(actual - Math.round(t)) > 1) {
                            fail(`${where} ${label} time: expected ${t} got ${actual}`);
                        }
                    }
                };
                if (si > 0) expectTime(base - 4, times[0], "lead pad");
                times.forEach((t, i) => expectTime(base + 4 * i, t, `point ${i}`));
                expectTime(base + 4 * n, times[n - 1], "tail pad");
            }
        }
    }

    const indexes = toArray(r._indexes);
    const maxIndex = N - 8;
    for (let k = 0; k < indexes.length; k++) {
        if (indexes[k] < 0 || (N > 0 && indexes[k] > maxIndex)) {
            fail(`${name}._indexes[${k}] = ${indexes[k]} out of range [0, ${maxIndex}]`);
        }
    }

    const actual = stripTriangles(indexes);
    const expected = expectedTriangles(r, segments);
    if (actual.join(";") !== expected.join(";")) {
        const missing = expected.filter((t) => !actual.includes(t));
        const extra = actual.filter((t) => !expected.includes(t));
        fail(
            `${name}._indexes triangles mismatch: missing [${missing.slice(0, 8).join(" ")}] extra [${extra
                .slice(0, 8)
                .join(" ")}] indexes=${indexes.slice(0, 64).join(",")}`
        );
    }
}

function cloneSegments(arr) {
    return arr.map((seg) => (seg ? seg.map((c) => (c ? [...c] : c)) : seg));
}

/**
 * Builds the same paths from scratch and compares every array with the
 * incrementally updated renderer.
 */
export function checkRebuild(r, name = "renderer") {
    if (!r._scene || r.isTextured) return;

    const fresh = new PolylineBatchRenderer(r._handler, { path3v: [], isTimed: r.isTimed });
    fresh._pathTimes = r._pathTimes.map((times) => (times ? times.slice() : times));
    fresh.__doubleToTwoFloats = r.__doubleToTwoFloats;
    fresh._defaultColor = r._defaultColor;
    fresh._pickingColor = r._pickingColor;
    fresh._thickness = r._thickness;
    fresh._pathColors = cloneSegments(r._pathColors);
    fresh._pathPickingColors = cloneSegments(r._pathPickingColors);
    fresh._segmentOpacity = [...r._segmentOpacity];
    fresh._segmentThickness = [...r._segmentThickness];
    fresh._pathClosed = [...r._pathClosed];
    fresh._scene = r._scene;
    fresh._createData3v(r._path3v.map((seg) => seg.map((p) => p.clone())));

    const arrays = ["_colors", "_thicknessArr", "_pickingColors", "_orders"];
    for (const key of arrays) {
        const a = toArray(r[key]),
            b = toArray(fresh[key]);
        expectLength(a, b.length, `${name}.${key} vs rebuild`);
        expectValues(a, 0, b, `${name}.${key} vs rebuild`);
    }

    const vertexCount = toArray(fresh._verticesHigh).length / 3;
    expectLength(r._verticesHigh, vertexCount * 3, `${name}._verticesHigh vs rebuild`);
    for (let v = 0; v < vertexCount; v++) {
        expectVec(decodeVertex(r, v), decodeVertex(fresh, v), `${name} vertex ${v} vs rebuild`);
    }

    if (r.isTimed) {
        const a = toArray(r._timesArr).map((t) => t + r._timeOrigin);
        const b = toArray(fresh._timesArr).map((t) => t + fresh._timeOrigin);
        expectLength(a, b.length, `${name}._timesArr vs rebuild`);
        a.forEach((t, i) => {
            if (Math.abs(t - b[i]) > 1) fail(`${name}._timesArr[${i}] = ${t}, rebuild ${b[i]}`);
        });
    }

    const t0 = stripTriangles(toArray(r._indexes)).join(";");
    const t1 = stripTriangles(toArray(fresh._indexes)).join(";");
    if (t0 !== t1) {
        fail(`${name}._indexes triangles differ from rebuild`);
    }
}

/**
 * Checks that each polyline's batch indexes point at its own segments in order.
 */
function polylineSegments(polyline) {
    if (polyline._path3v.some((seg) => seg && seg.length > 0)) return polyline._path3v;
    return polyline._pathLonLat.map((seg) => (seg || []).map((ll) => wgs84.lonLatToCartesian(ll)));
}

export function checkHandler(handler, expectedSegments = new Map()) {
    const renderers = getRenderers(handler);
    renderers.forEach((r, i) => {
        checkRenderer(r, `renderer#${i}`);
        checkRebuild(r, `renderer#${i}`);
    });

    const owned = new Map(renderers.map((r) => [r, new Set()]));

    for (const polyline of handler._polylines) {
        const br = polyline._batchRenderer;
        const indexes = polyline._batchRendererIndexes;

        if (!polyline.getVisibility()) {
            if (indexes.length) fail(`hidden polyline still owns batch paths ${indexes}`);
            continue;
        }

        const own = owned.get(br);
        if (!own) fail("polyline batch renderer does not belong to its handler");

        const expected = expectedSegments.get(polyline) || polylineSegments(polyline);
        if (indexes.length !== expected.length) {
            fail(`polyline has ${expected.length} segments but ${indexes.length} batch indexes`);
        }

        for (let i = 0; i < indexes.length; i++) {
            if (!expected[i] || expected[i].length === 0) {
                if (indexes[i] !== -1) fail(`empty segment ${i} owns batch path ${indexes[i]}`);
                continue;
            }
            if (own.has(indexes[i])) fail(`batch path ${indexes[i]} is owned twice`);
            own.add(indexes[i]);
            const seg = br._path3v[indexes[i]];
            if (!seg || seg.length !== expected[i].length) {
                fail(
                    `segment ${i}: batch path ${indexes[i]} has ${seg && seg.length} points, polyline ${expected[i].length}`
                );
            }
            for (let k = 0; k < seg.length; k++) {
                expectVec(seg[k], expected[i][k], `polyline segment ${i} point ${k}`);
            }
        }
    }

    for (const [r, own] of owned) {
        const count = r._path3v.length;
        if (own.size !== count) {
            fail(`renderer holds ${count} paths but polylines own ${own.size}`);
        }
    }
}

/**
 * Reads the per-point colors of a polyline segment back from its batch arrays.
 */
export function expectPointColors(polyline, segmentIndex, colors, opacity = 1.0) {
    const r = polyline._batchRenderer;
    const batchIndex = polyline._batchRendererIndexes[segmentIndex];
    const entry = nonEmptySegments(r).segments.find((e) => e.s === batchIndex);
    if (!entry) fail(`segment ${segmentIndex} is not in the batch`);
    if (entry.path.length !== colors.length) {
        fail(`segment ${segmentIndex} has ${entry.path.length} points, expected ${colors.length} colors`);
    }
    colors.forEach((c, i) => {
        const rgba = [srgbToLinear(c[0]), srgbToLinear(c[1]), srgbToLinear(c[2]), (c[3] ?? 1) * opacity];
        expectValues(r._colors, (entry.base + 4 * i) * 4, rgba, `segment ${segmentIndex} point ${i} color`);
    });
}

/**
 * Reads the per-point times of a polyline segment back from its batch arrays.
 */
export function expectPointTimes(polyline, segmentIndex, times) {
    const r = polyline._batchRenderer;
    const batchIndex = polyline._batchRendererIndexes[segmentIndex];
    const entry = nonEmptySegments(r).segments.find((e) => e.s === batchIndex);
    if (!entry) fail(`segment ${segmentIndex} is not in the batch`);
    if (entry.path.length !== times.length) {
        fail(`segment ${segmentIndex} has ${entry.path.length} points, expected ${times.length} times`);
    }
    times.forEach((t, i) => {
        const actual = absoluteTime(r, (entry.base + 4 * i) * 1);
        if (Math.abs(actual - t) > 1) fail(`segment ${segmentIndex} point ${i} time: expected ${t} got ${actual}`);
    });
}
