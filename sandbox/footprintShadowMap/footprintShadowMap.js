import {
    Globe,
    control,
    Vector,
    Entity,
    LonLat,
    OpenStreetMap,
    GlobusRgbTerrain,
    Bing,
    input,
    Object3d,
    ShadowMap,
    DepthCamera,
    Ellipsoid,
    XYZ,
    Vec3
} from "../../lib/og.es.js";

let myObjects = new Vector("myObjects", {
    scaleByDistance: [1, 1, 1]
});

let horizonMarkers = new Vector("horizonMarkers", {
    scaleByDistance: [1, 100000000, 0.003],
    receiveShadows: false
});

const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    layers: [
        new XYZ("white", {
            isBaseLayer: true
        }),
        new Bing(),
        new OpenStreetMap(),
        myObjects,
        horizonMarkers
    ],
    atmosphereEnabled: true,
    fontsSrc: "../../res/fonts",
    sun: {
        localDateTime: new Date(2026, 7, 4, 18, 0)
    }
});

globus.planet.addControl(new control.TimelineControl());
globus.planet.addControl(new control.DebugInfo());
globus.planet.addControl(new control.LayerSwitcher());
globus.planet.addControl(new control.DrawingSwitcher());
globus.planet.addControl(new control.EntityEditor());
globus.planet.addControl(new control.ToggleWireframe());

// Casters standing well above the ground, which is what the caster volume has to reach up to: the tallest
// sits at 10 km, the height MAX_SHADOW_CASTER_HEIGHT is cut for.
const SKY_CUBES = [
    { name: "sky-cube", lonLat: new LonLat(9.0814898, 46.4864594, 10000), size: 10000 },
    { name: "sky-cube-medium", lonLat: new LonLat(9.2314898, 46.4864594, 6000), size: 6000 },
    { name: "sky-cube-small", lonLat: new LonLat(8.9514898, 46.4864594, 3000), size: 3000 }
];

for (let i = 0; i < SKY_CUBES.length; i++) {
    let cube = SKY_CUBES[i];

    myObjects.add(
        new Entity({
            name: cube.name,
            lonlat: cube.lonLat,
            independentPicking: true,
            geoObject: {
                tag: cube.name,
                object3d: Object3d.createCube(cube.size, cube.size, cube.size).setColor("white")
            }
        })
    );
}

// Side of every shadow map. The fit reads the resolution from here rather than from a framebuffer: all
// bands are built by one factory, so they all share it.
const SHADOW_MAP_SIZE = 1024;
// Bands the footprint divides into once the split triggers, nearest to the camera first, see
// getFootprintAreas. One shadow map each, so this cannot exceed the library's MAX_SHADOW_MAPS.
const AREA_COUNT = 3;
// Corners of a band. It is always a plain quad, see getAreaQuad.
const AREA_QUAD_POINTS = 4;
// Near plane of every shadow camera. The far plane is fitted per band and per frame.
const SHADOW_CAMERA_NEAR = 1000;
const FOOTPRINT_SCREEN_EDGE_SEARCH_STEPS = 4;
// Hysteresis on the rail pairing, see updateAreaRails: the other pairing has to span this much more of
// the distance gradient before the rails flip to it, so terrain jitter cannot flap the bands at the
// diagonal.
const AREA_CUT_PAIRING_SLACK = 1.1;
// Hysteresis on the split trigger: the footprint texel has to exceed the target by this factor to start
// splitting, and drop below it to stop. Without the gap a texel sitting on the target would flap the
// whole split every frame.
const AREA_SPLIT_TRIGGER_SLACK = 1.15;
// Caster volume height above the footprint, tracking the measured terrain relief, with the footprint
// radius as a floor over flat ground. It has to cover everything that casts onto the footprint, but
// it never enters the orthographic bounds: it only pushes the camera sunward, so raising it costs
// depth range and nothing else. The cap is what lets the 10 km sky cube of this example cast.
const SHADOW_CASTER_RELIEF_FACTOR = 1.25;
const SHADOW_CASTER_HEIGHT_FACTOR = 0.25;
const MIN_SHADOW_CASTER_HEIGHT = 100;
const MAX_SHADOW_CASTER_HEIGHT = 10000;
// Light space depth kept in front of the caster volume, the larger of an absolute distance and a multiple
// of the caster volume height. Everything within it still casts. Moving the camera sunward leaves the
// orthographic bounds untouched, so this buys caster coverage at no cost to shadow resolution: it only
// widens the depth range, and the depth target is 32 bit float.
const SHADOW_CASTER_CLEARANCE = 100000;
const SHADOW_CASTER_CLEARANCE_FACTOR = 6.0;
const SHADOW_DEPTH_BIAS_TEXELS = 100.0;
const SHADOW_DEPTH_EPSILON_TEXELS = 1.0;
// Floor on the light-space depth reserved behind the farthest shadow receiver, for terrain that goes
// below the footprint reference level. The measured descent raises it, see fitAreaCamera.
const SHADOW_RECEIVER_DEPTH_PADDING = 500;
// PCF taps reach this far outside the sampled texel, and a tap that lands outside the map reads as
// uncovered, so the fit needs this much border.
const SHADOW_ORTHO_TEXEL_PADDING = 3;
// Fractional margin added to each side of the fitted orthographic bounds, on top of the texel border.
// Covers what the fit itself cannot: the footprint is sampled at the four screen corners only, so the
// real ground boundary bulges outside the polygon they define, by an amount no measurement here sees.
const SHADOW_ORTHO_MARGIN_FACTOR = 0.01;
// Rungs per octave of the texel size ladder the orthographic extent is quantized onto, the ratio
// between neighbouring rungs, and the extra slack below the release band. See quantizeOrthoTexelSize.
const ORTHO_TEXEL_QUANTIZATION_STEPS = 4;
const ORTHO_TEXEL_QUANTIZATION_RATIO = Math.pow(2.0, 1.0 / ORTHO_TEXEL_QUANTIZATION_STEPS);
const ORTHO_TEXEL_RELEASE_SLACK = 0.15;
// Smallest bounds padding and far-near gap, in world units.
const MIN_SHADOW_ORTHO_SIZE = 1.0;
// Terrain height under the camera is quantized to this step, in world units, before the footprint
// ellipsoid is rebuilt, so that the footprint does not jitter while flying over rough terrain.
const TERRAIN_ELLIPSOID_HEIGHT_STEP = 1.0;
// How much ground a metre of relief may buy along a view ray, as the reciprocal of the smallest ray slope
// the relief walk accepts. Rays grazing the horizon trade a metre of height for kilometres of ground, and
// the relief driving the walk is only ever an estimate, so the walk is flattened out near the horizon
// instead of following the true grazing geometry.
const MIN_FOOTPRINT_RAY_SLOPE = 0.1;
// How far the outward half of the relief walk - terrain below the reference level - may enlarge the
// footprint sideways, as a fraction of its radius. Only that sideways part is capped, the rest of the
// walk is depth. The inward half needs no cap, the eye bounds it.
//
// The one value here that trades coverage for resolution rather than buying both. Ground descending away
// from the camera is seen much further than the reference level suggests, and near the ground that descent
// is easily a multiple of the footprint, so a tight cap leaves the far part of such a view outside the map.
// It still has to stay a fraction of the footprint: a camera metres above a plateau has a footprint metres
// across, and whatever a coarse ancestor tile reports about terrain a kilometre below it cannot be visible
// from there.
const RELIEF_LATERAL_FACTOR = 0.5;
// Sanity clamps on the terrain range read out of the quad tree, in world units. While tiles load, a fresh
// segment reports the range of the coarse ancestor it borrows geometry from, so the range can briefly
// describe a continent rather than the view.
const MAX_RELIEF_UP = 12000;
const MAX_RELIEF_DOWN = 2000;

// The live knobs, exposed as window.shadowMapSandbox.params for console experiments. Everything else that
// shapes the fit is a constant above.
const shadowParams = {
    // The reference texel, in world units on the ground: the footprint stays whole while its own texel
    // keeps this, and divides into AREA_COUNT bands once it does not. Ground rather than light space so
    // that the sun cannot influence the split, see getAreaSpread - and the fitted light space texel then
    // comes out at or below it, since the sun can only compress ground onto the map, never stretch it.
    //
    // Set to 0 to take the trigger out of the way and always divide - the way to see what the division
    // does before deciding what the reference should be.
    targetTexelSize: 1.5,
    // Which band the debug overlay follows, 0 being the nearest to the camera. Nothing but the overlay
    // reads it, see updateAreaDebug.
    areaIndex: 0
};

const depthPreviewShader = `void mainImage(out vec4 fragColor, in vec2 fragCoord){
                float depth = texture(inputTextureArray, vec3(fragCoord, float(u_arrayLayer))).r;
                float normalized = depth <= 0.0 ? 0.0 : pow(1.0 - depth, 0.65);
                fragColor = vec4(vec3(clamp(normalized, 0.0, 1.0)), 1.0);
            }`;

const depthCameraHandler = new control.DepthCameraHandler();
globus.planet.addControl(depthCameraHandler);

const depthCameras = [];

for (let i = 0; i < AREA_COUNT; i++) {
    depthCameras.push(
        depthCameraHandler.add(
            new DepthCamera({
                width: SHADOW_MAP_SIZE,
                height: SHADOW_MAP_SIZE,
                near: SHADOW_CAMERA_NEAR,
                isOrthographic: true,
                enableSegmentSkirts: true,
                enableSegmentFaceCulling: false,
                excludeLayers: [horizonMarkers],
                showFootprint: false
            })
        )
    );
}

// One map per band, added nearest first. ShadowManager keeps insertion order, and shadows.glsl multiplies
// every active map into the fragment, so all bands shade the ground at once.
const shadowMaps = [];

for (let i = 0; i < AREA_COUNT; i++) {
    let shadowMap = new ShadowMap({
        enabled: i === 0,
        depthCamera: depthCameras[i]
    });

    globus.planet.renderer.shadows.add(shadowMap);
    shadowMaps.push(shadowMap);

    globus.planet.addControl(
        new control.FramebufferPreview({
            title: `Band ${i}`,
            arrayTexture: shadowMap.arrayTexture,
            arrayLayer: shadowMap.slot,
            width: 220,
            height: 220,
            image: depthPreviewShader,
            flippedY: true
        })
    );
}

// Debug overlay of one band: corner markers on the reference surface, rays dropping to the terrain under
// them, and one closed contour through the terrain points.
const footprintMarkers = [];
const footprintGroundRays = [];

for (let i = 0; i < AREA_QUAD_POINTS; i++) {
    let markerName = `footprint-marker-${i}`;

    footprintMarkers.push(
        new Entity({
            name: markerName,
            visibility: false,
            independentPicking: true,
            geoObject: {
                tag: markerName,
                object3d: Object3d.createSphere(16, 16, 3).setColor("yellow")
            }
        })
    );

    footprintGroundRays.push(
        new Entity({
            name: `footprint-ground-ray-${i}`,
            visibility: false,
            ray: {
                startPosition: new Vec3(),
                endPosition: new Vec3(),
                startColor: "rgba(0,255,255,0.9)",
                endColor: "rgba(0,255,255,0.15)",
                thickness: 2.5
            }
        })
    );

    horizonMarkers.add(footprintMarkers[i]);
    horizonMarkers.add(footprintGroundRays[i]);
}

const footprintContour = new Entity({
    name: "footprint-contour",
    visibility: false,
    polyline: {
        path3v: [],
        thickness: 3,
        color: "yellow"
    }
});
horizonMarkers.add(footprintContour);

// The footprint is sampled against the base ellipsoid raised to the terrain level. Without terrain
// data getAltitude() falls back to the geodetic height and this is the base ellipsoid.
let footprintEllipsoid = globus.planet.ellipsoid;
let footprintEllipsoidHeight = 0.0;

// Texel size each band's extent was last quantized to, per axis. Carried between frames so that a
// shrinking extent holds its rung until it has clearly left it, see quantizeOrthoTexelSize. Per band,
// because the rungs are hysteresis state and sharing them across bands would make each band drag the
// others onto its own rung.
const orthoTexelSizeX = new Array(AREA_COUNT).fill(0.0);
const orthoTexelSizeY = new Array(AREA_COUNT).fill(0.0);

// Rail pairing of the previous frame, held by hysteresis - see updateAreaRails. 0 runs the rails along
// the screen side edges, 1 along the top and bottom ones.
let currentAreaCutPairing = 0;

// Whether the footprint was split last frame, held by hysteresis - see AREA_SPLIT_TRIGGER_SLACK.
let currentAreaSplitActive = false;

// The footprint ellipsoid is raised to the terrain right under the camera, and to nothing else. It must
// not follow the lowest rendered terrain as well - that covers a lateral miss with a global vertical term,
// and it feeds back into itself once the drop is capped against the footprint the drop has grown. The far
// part of the visible ground, which a camera standing above the ground it looks at meets past a reference
// surface raised over it, is reached along the view rays instead, see getReceiverBoundsPoints, which
// leaves the footprint independent of the tile loading state.
function updateFootprintEllipsoid(mcam) {
    let terrainHeight =
        Math.round((mcam.getHeight() - mcam.getAltitude()) / TERRAIN_ELLIPSOID_HEIGHT_STEP) *
        TERRAIN_ELLIPSOID_HEIGHT_STEP;

    if (terrainHeight === footprintEllipsoidHeight) {
        return;
    }

    let baseEllipsoid = globus.planet.ellipsoid;

    footprintEllipsoidHeight = terrainHeight;
    footprintEllipsoid =
        terrainHeight === 0.0
            ? baseEllipsoid
            : new Ellipsoid(baseEllipsoid.equatorialSize + terrainHeight, baseEllipsoid.polarSize + terrainHeight);
}

function hitFootprintEllipsoid(ray) {
    return footprintEllipsoid.hitRay(ray.origin, ray.direction);
}

function getEllipsoidHit(mcam, x, y) {
    return hitFootprintEllipsoid(mcam.getRay(x, y));
}

// Terrain points under the corners of a band, taken from the segments that are actually rendered, so they
// are the ground the view sees rather than the ground the terrain source would eventually report. Falls
// back to the reference surface where no rendered segment covers a corner - horizon points, mostly - and
// for a corner already on that surface the projection returns it unchanged, so the fallback loses nothing.
//
// The markers are the probes: the lookup finds its segment from the entity's own coordinates, so a marker
// has to be moved onto the corner before it. They are the debug overlay as well, which is why the overlay
// is drawn after every band has been fitted, see updateShadowCamera.
function getAreaGroundPoints(areaPoints) {
    let grounds = [];

    for (let i = 0; i < areaPoints.length; i++) {
        let marker = footprintMarkers[i];
        let terrainPoint = new Vec3();

        marker.setVisibility(true);
        marker.setAbsoluteCartesian3v(areaPoints[i]);

        let terrainDistance = globus.planet.getEntityTerrainPoint(marker, terrainPoint);

        grounds.push(terrainDistance != undefined ? terrainPoint : footprintEllipsoid.projToSurface(areaPoints[i]));
    }

    return grounds;
}

function getAveragePoint(points) {
    let center = new Vec3();

    for (let i = 0; i < points.length; i++) {
        center.addA(points[i]);
    }

    return center.scale(1.0 / points.length);
}

// Everything the rest of the fit derives from the corners, in one pass: the surface normals, which both
// the relief walk and the caster volume need, and the radius, which caps the walk.
function getBaseFootprint(points) {
    let center = getAveragePoint(points);
    let normals = [];
    let radius = 0.0;

    for (let i = 0; i < points.length; i++) {
        normals.push(footprintEllipsoid.getSurfaceNormal3v(points[i]));
        radius = Math.max(radius, points[i].distance(center));
    }

    return { center, points, normals, radius };
}

// Up vector of the light space basis, seeded from the polar axis so that the basis owes the camera nothing
// and turns only as the sun does. That is what gives both axes of the texel snap a grid fixed in the world,
// see snapOrthographicBounds.
//
// Seeding it from the surface normal under the footprint center instead fits tighter bounds, by up to
// sqrt(2) in the worst orientation, and costs the X anchor: with that seed right = cross(up, light) is
// perpendicular to the plane the center lies in, so center . right is identically zero - measured, not
// argued - and there is nothing on X for the snap to floor against.
//
// The sun never comes within 66 degrees of the polar axis, so the projection cannot degenerate.
function getStableLightUp(lightDirection) {
    return Vec3.proj_b_to_plane(Vec3.NORTH, lightDirection).normalize();
}

// How far a traversal's rendered terrain reaches above and below a reference radius, as two positive
// heights. The traversal accumulates the geocentric distance range of the vertices it renders, in the very
// pass that already builds the segment bounds, so nothing is scanned per frame and the range holds at
// every moment of tile loading. The planet height factor is in it, unlike in the geometric floor.
function getStrategyRelief(quadTreeStrategy, upFrom, downFrom) {
    if (!quadTreeStrategy || quadTreeStrategy.maxTerrainRadius <= 0.0) {
        return { up: 0.0, down: 0.0 };
    }

    return {
        up: Math.max(0.0, quadTreeStrategy.maxTerrainRadius - upFrom),
        down: Math.max(0.0, downFrom - quadTreeStrategy.minTerrainRadius)
    };
}

function getCornerRadiusRange(footprintPoints) {
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < footprintPoints.length; i++) {
        let radius = footprintPoints[i].length();

        min = Math.min(min, radius);
        max = Math.max(max, radius);
    }

    return { min, max };
}

// Relief the footprint corners do not already stand for. They sit on the terrain, so each carries its own
// elevation into the bounds, and measuring the range from the reference surface would count that elevation
// twice and pay for it in texels. What is left is terrain rising above the highest corner or dropping
// below the lowest - interior relief the polygon points cannot see - which falls to zero on its own as soon
// as the corners happen to span the range.
function getTerrainRelief(mcam, footprint, depthCamera) {
    let corners = getCornerRadiusRange(footprint.points);
    // The receivers, and the only thing the fit may be sized by. Measured from the corners themselves, so
    // a corner standing on a summit asks for no upward walk at all.
    let view = getStrategyRelief(globus.planet.quadTreeStrategy, corners.max, corners.min);
    // What this band's shadow map is actually filled with. The depth camera traverses its own quad tree
    // from the light's side, so this covers terrain the main camera never looks at, casters behind the eye
    // among them, and it decides whether the depth interval holds everything in the map. It lags a frame,
    // since that traversal only happens inside DepthCamera.frame(), and it feeds the depth interval alone:
    // a range measured through a frustum must never size that same frustum sideways, or culling and fitting
    // chase each other. In depth it cannot, because the view range is a floor owing nothing to the shadow
    // camera. Measured from the reference surface, which is all the corners can say about terrain the main
    // camera never looked at.
    let referenceRadius = mcam.eye.length() - mcam.getHeight() + footprintEllipsoidHeight;
    let map = getStrategyRelief(depthCamera.quadTreeStrategy, referenceRadius, referenceRadius);

    return {
        up: Math.min(MAX_RELIEF_UP, view.up),
        down: Math.min(MAX_RELIEF_DOWN, view.down),
        depthDown: Math.min(MAX_RELIEF_DOWN, Math.max(view.down, map.down))
    };
}

// The polygon points stand on the ground, so the elevation at each is already in the bounds. What they
// cannot see is the terrain between and around them, and that is what this walk covers - the residual
// relief above the highest corner and below the lowest, see getTerrainRelief.
//
// Dilating every corner along its surface normal by that relief is the obvious way, and it ties shadow
// quality to the tile loading state: the offset is lateral in light space too, by up to
// relief * cos(sunElevation), so an over reported relief grows the orthographic bounds, and the texel with
// them, on both sides at once.
//
// The terrain is not off to the side of the footprint though, it lies along the rays the corners were
// found with, so those rays are what the corners walk. The direction is taken from the eye to the ground
// corner rather than from the original screen ray, since the corner has dropped or risen to the terrain
// since; the two differ by the corner's own elevation, which is exactly what the walk no longer has to
// account for. The walk is then asymmetric in the way the problem needs: terrain above is met earlier
// along a ray, so it pulls a corner toward the camera and can only shrink the footprint, while only
// terrain below pushes a corner outward. The rise - the term that carries the mountains, and the term the
// loader over reports - is the free one, bounded by the eye rather than by a cap that would have to clip
// the mountains to hold the texel down.
function getReceiverBoundsPoints(mcam, footprint, relief) {
    let points = footprint.points.slice();

    if (relief.up <= 0.0 && relief.down <= 0.0) {
        return points;
    }

    let lateralLimit = footprint.radius * RELIEF_LATERAL_FACTOR;

    for (let i = 0; i < footprint.points.length; i++) {
        let point = footprint.points[i];
        let toPoint = point.sub(mcam.eye);
        let distance = toPoint.length();

        if (distance <= 0.0) {
            continue;
        }

        let direction = toPoint.scale(1.0 / distance);
        // Height a ray loses per unit travelled. Corners that fell back to a horizon point are
        // tangent to the surface and have no slope at all, hence the floor.
        let slope = Math.max(-direction.dot(footprint.normals[i]), MIN_FOOTPRINT_RAY_SLOPE);

        if (relief.up > 0.0) {
            // Toward the camera, and never past it: a ray carries no terrain behind the eye. Nothing
            // else has to bound this one - the excursion is at most the camera's own position, which
            // is where the relief runs out of room to hide behind.
            points.push(point.add(direction.scaleTo(-Math.min(relief.up / slope, distance))));
        }

        if (relief.down > 0.0) {
            // Only the part of a walk that runs along the surface enlarges the footprint; the part
            // along the normal is depth, and depth is free here. So the cap is on the tangential
            // component alone, see RELIEF_LATERAL_FACTOR.
            let tangential = Math.sqrt(Math.max(0.0, 1.0 - slope * slope));
            let limit = tangential > 0.0 ? lateralLimit / tangential : Infinity;

            points.push(point.add(direction.scaleTo(Math.min(relief.down / slope, limit))));
        }
    }

    return points;
}

// Rounds a value up onto a ladder of `steps` rungs per octave. For quantities that only have to be
// roughly right, and badly need to stop moving every frame.
function quantizeUpToOctaveLadder(value, steps) {
    if (!(value > 0.0)) {
        return 0.0;
    }

    return Math.pow(2.0, Math.ceil(Math.log2(value) * steps) / steps);
}

// Rounds a texel size up onto the ladder, holding the previous rung while the request still fits it.
// Without the ladder the grid spacing changes every frame, and a grid whose spacing moves is no better
// than no grid at all.
//
// The release band has to reach past the rung below, not stop at it. A request that has just forced a jump
// up sits a hair above the rung it came from, which is exactly where a band of one whole ratio ends - so
// it offers no protection there, and a request hovering on a rung alternates rungs almost every frame.
// Measured: 216 rung changes over 400 frames, at any noise amplitude down to 0.1%. That is the map pulsing
// by the full ratio, 19%, which reads as flicker rather than as a resolution change. The slack costs
// holding a rung up to RATIO * (1 + slack) coarser than the fit asks before letting go.
function quantizeOrthoTexelSize(extent, prevTexelSize) {
    let texelSize = extent / SHADOW_MAP_SIZE;

    if (!(texelSize > 0.0)) {
        return 0.0;
    }

    let releaseBelow = prevTexelSize / (ORTHO_TEXEL_QUANTIZATION_RATIO * (1.0 + ORTHO_TEXEL_RELEASE_SLACK));

    if (prevTexelSize > 0.0 && texelSize <= prevTexelSize && texelSize > releaseBelow) {
        return prevTexelSize;
    }

    return quantizeUpToOctaveLadder(texelSize, ORTHO_TEXEL_QUANTIZATION_STEPS);
}

// Quantized coarsely - in doublings - because this height places the shadow camera eye through
// getCasterMinZ, and that eye must not move by kilometres every time the tile loader revises the terrain
// range. DepthCamera picks which quad tree traversal to render from by testing whether the eye falls
// inside the main frustum, so a jittering eye can flip the whole depth pass between two different sets of
// segments, skirts toggling along with it - the map blinking rather than changing resolution. Nothing
// downstream needs this height precise: the caster clearance is an absolute hundred kilometres and
// swallows it whole.
function getCasterHeight(footprintRadius, terrainRelief) {
    let height = Math.max(
        footprintRadius * SHADOW_CASTER_HEIGHT_FACTOR * (globus.planet._heightFactor || 1.0),
        terrainRelief * SHADOW_CASTER_RELIEF_FACTOR
    );
    let clamped = Math.min(MAX_SHADOW_CASTER_HEIGHT, Math.max(MIN_SHADOW_CASTER_HEIGHT, height));

    return Math.min(MAX_SHADOW_CASTER_HEIGHT, quantizeUpToOctaveLadder(clamped, 1));
}

// Light space depth of the closest point of the caster volume, which is the footprint raised by the
// caster height. Only the near plane has to clear it: a caster whose shadow lands on the footprint
// shares the light space XY of that shadow, so it is already inside the fitted bounds sideways.
function getCasterMinZ(footprint, forward, casterHeight) {
    let minZ = Infinity;

    for (let i = 0; i < footprint.points.length; i++) {
        let casterPoint = footprint.points[i].add(footprint.normals[i].scaleTo(casterHeight));

        minZ = Math.min(minZ, casterPoint.sub(footprint.center).dot(forward));
    }

    return minZ;
}

function getLightSpaceBounds(origin, right, up, forward, points) {
    let bounds = {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
        minZ: Infinity,
        maxZ: -Infinity
    };

    for (let i = 0; i < points.length; i++) {
        let relativePoint = points[i].sub(origin);
        let x = relativePoint.dot(right);
        let y = relativePoint.dot(up);
        let z = relativePoint.dot(forward);

        bounds.minX = Math.min(bounds.minX, x);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxY = Math.max(bounds.maxY, y);
        bounds.minZ = Math.min(bounds.minZ, z);
        bounds.maxZ = Math.max(bounds.maxZ, z);
    }

    return bounds;
}

function expandOrthographicBounds(bounds) {
    let width = bounds.maxX - bounds.minX;
    let height = bounds.maxY - bounds.minY;
    let paddingX = Math.max(
        width * SHADOW_ORTHO_MARGIN_FACTOR + (width / SHADOW_MAP_SIZE) * SHADOW_ORTHO_TEXEL_PADDING,
        MIN_SHADOW_ORTHO_SIZE
    );
    let paddingY = Math.max(
        height * SHADOW_ORTHO_MARGIN_FACTOR + (height / SHADOW_MAP_SIZE) * SHADOW_ORTHO_TEXEL_PADDING,
        MIN_SHADOW_ORTHO_SIZE
    );

    return {
        left: bounds.minX - paddingX,
        right: bounds.maxX + paddingX,
        bottom: bounds.minY - paddingY,
        top: bounds.maxY + paddingY
    };
}

// Puts the fitted bounds onto a texel grid fixed in world space, which is what stops shadow edges from
// crawling as the camera moves: the map then covers the same world texels from frame to frame, so each
// receiver keeps sampling the same depth sample instead of a slightly different one every frame.
//
// The anchor is the footprint center's light space coordinate, and that is the same coordinate the
// projection is relative to, since the shadow camera eye is the center displaced along forward only, and
// forward is perpendicular to both axes. Quantizing rounds the extent up, so the snapped rectangle is
// never smaller than the fitted one - it only shifts by under a texel, which the texel border covers.
//
// DepthCamera carries the same machinery, gated behind `camera.isMoving` - which the renderer only ever
// sets on its active camera, so a depth camera never reports motion and the snap there never runs. Leave
// it that way; whatever runs there would also have to be fitted first, and it is not.
function snapOrthographicBounds(bounds, right, up, anchor, index) {
    let texelSizeX = quantizeOrthoTexelSize(bounds.right - bounds.left, orthoTexelSizeX[index]);
    let texelSizeY = quantizeOrthoTexelSize(bounds.top - bounds.bottom, orthoTexelSizeY[index]);

    if (texelSizeX <= 0.0 || texelSizeY <= 0.0) {
        return bounds;
    }

    orthoTexelSizeX[index] = texelSizeX;
    orthoTexelSizeY[index] = texelSizeY;

    let width = texelSizeX * SHADOW_MAP_SIZE;
    let height = texelSizeY * SHADOW_MAP_SIZE;
    let anchorX = anchor.dot(right);
    let anchorY = anchor.dot(up);
    let centerX = (bounds.left + bounds.right) * 0.5;
    let centerY = (bounds.bottom + bounds.top) * 0.5;
    let left = Math.floor((anchorX + centerX - width * 0.5) / texelSizeX) * texelSizeX - anchorX;
    let bottom = Math.floor((anchorY + centerY - height * 0.5) / texelSizeY) * texelSizeY - anchorY;

    return { left, right: left + width, bottom, top: bottom + height };
}

// Returns the horizon point in the given direction: the tangency point of the line drawn from the
// camera to the sphere of radius `radius`. Seen from the sphere center, that point sits `r^2 / d`
// along the camera up axis and `r * sqrt(d^2 - r^2) / d` along the horizontal direction.
function getHorizonPointByDirection(mcam, direction) {
    let up = mcam.eye.getNormal();
    let horizonDirection = Vec3.proj_b_to_plane(direction, up);

    if (horizonDirection.length2() < 1e-8) {
        return undefined;
    }

    horizonDirection.normalize();

    let distanceToCamera = mcam.eye.length();
    // Same terrain level the footprint ellipsoid stands at, so that the horizon points the corners
    // fall back to keep up with the ellipsoid hits along the rest of the screen edge.
    let radius = distanceToCamera - mcam.getAltitude();

    if (distanceToCamera <= radius) {
        return undefined;
    }

    let tangentDistance = Math.sqrt(distanceToCamera * distanceToCamera - radius * radius);
    let upDistance = (radius * radius) / distanceToCamera;
    let horizonDistance = (radius * tangentDistance) / distanceToCamera;

    return up.scaleTo(upDistance).addA(horizonDirection.scaleTo(horizonDistance));
}

function getFootprintBoundaryOnScreenSegment(mcam, hitX, missX, y) {
    let x0 = hitX;
    let x1 = missX;
    let hit = getEllipsoidHit(mcam, x0, y);

    if (!hit) {
        return undefined;
    }

    for (let i = 0; i < FOOTPRINT_SCREEN_EDGE_SEARCH_STEPS; i++) {
        let x = (x0 + x1) * 0.5;
        let midHit = getEllipsoidHit(mcam, x, y);

        if (midHit) {
            x0 = x;
            hit = midHit;
        } else {
            x1 = x;
        }
    }

    return hit;
}

function getCameraFootprint(mcam) {
    let screenLeft = 0;
    let screenTop = 0;
    let screenRight = mcam.width;
    let screenBottom = mcam.height;

    // One ray per corner, reused for the hit and for the horizon fallback below. Unprojecting each corner
    // twice is the same answer twice over.
    let rayLt = mcam.getRay(screenLeft, screenTop);
    let rayRt = mcam.getRay(screenRight, screenTop);
    let rayLb = mcam.getRay(screenLeft, screenBottom);
    let rayRb = mcam.getRay(screenRight, screenBottom);

    let rawHitLt = hitFootprintEllipsoid(rayLt);
    let rawHitRt = hitFootprintEllipsoid(rayRt);
    let rawHitLb = hitFootprintEllipsoid(rayLb);
    let rawHitRb = hitFootprintEllipsoid(rayRb);

    let hitLt = rawHitLt;
    let hitRt = rawHitRt;
    let hitLb = rawHitLb;
    let hitRb = rawHitRb;

    if (!hitLt && (rawHitLb || rawHitRt)) {
        hitLt = getHorizonPointByDirection(mcam, rayLt.direction);
    }

    if (!hitRt && (rawHitRb || rawHitLt)) {
        hitRt = getHorizonPointByDirection(mcam, rayRt.direction);
    }

    if (!hitLb && (rawHitLt || rawHitRb)) {
        hitLb = getHorizonPointByDirection(mcam, rayLb.direction);
    }

    if (!hitRb && (rawHitRt || rawHitLb)) {
        hitRb = getHorizonPointByDirection(mcam, rayRb.direction);
    }

    let isLeftColumnOnly = rawHitLt && rawHitLb && !rawHitRt && !rawHitRb;
    let isRightColumnOnly = rawHitRt && rawHitRb && !rawHitLt && !rawHitLb;

    if (isLeftColumnOnly) {
        hitRt = getFootprintBoundaryOnScreenSegment(mcam, screenLeft, screenRight, screenTop) || hitRt;
        hitRb = getFootprintBoundaryOnScreenSegment(mcam, screenLeft, screenRight, screenBottom) || hitRb;
    } else if (isRightColumnOnly) {
        hitLt = getFootprintBoundaryOnScreenSegment(mcam, screenRight, screenLeft, screenTop) || hitLt;
        hitLb = getFootprintBoundaryOnScreenSegment(mcam, screenRight, screenLeft, screenBottom) || hitLb;
    }

    return [hitLt, hitRt, hitLb, hitRb];
}

// Ground size of a quad, in world units: the larger of its depth along the rails and its width across
// them. Deliberately sun free - distances between the four points and nothing else - so the split is a
// function of the camera and the footprint alone. Measuring the light space box here instead lets the sun
// compress whichever ground axis it looks along, which bloats the bands whenever the sun and the camera
// share a direction and drags the boundaries around as the sun travels.
function getAreaSpread(quad) {
    let width = Math.max(quad[0].distance(quad[1]), quad[3].distance(quad[2]));
    let depth = Math.max(quad[0].distance(quad[3]), quad[1].distance(quad[2]));

    return Math.max(depth, width);
}

function lerpPoint(a, b, t) {
    return a.add(b.sub(a).scale(t));
}

// The rails the bands run between: the pair of opposite footprint edges spanning the eye distance
// gradient, each oriented near end first. The screen side edges span it while the horizon is level; roll
// turns the gradient across the screen and hands the job to the top and bottom pair. At the diagonal
// both pairings span about equally and neither is exact - the four point price at 45 degrees of roll -
// so the choice carries hysteresis rather than precision.
function updateAreaRails(corners, eye) {
    let dLt = corners[0].distance(eye);
    let dRt = corners[1].distance(eye);
    let dLb = corners[2].distance(eye);
    let dRb = corners[3].distance(eye);
    let sideSpan = Math.abs(dLt - dLb) + Math.abs(dRt - dRb);
    let rowSpan = Math.abs(dRb - dLb) + Math.abs(dRt - dLt);

    if (currentAreaCutPairing === 0 && rowSpan > sideSpan * AREA_CUT_PAIRING_SLACK) {
        currentAreaCutPairing = 1;
    } else if (currentAreaCutPairing === 1 && sideSpan > rowSpan * AREA_CUT_PAIRING_SLACK) {
        currentAreaCutPairing = 0;
    }

    // Corners arrive as [lt, rt, lb, rb]. Pairing 0 runs the rails lb-lt and rb-rt, pairing 1 lb-rb and
    // lt-rt.
    let rails =
        currentAreaCutPairing === 0
            ? [
                  [corners[2], corners[0]],
                  [corners[3], corners[1]]
              ]
            : [
                  [corners[2], corners[3]],
                  [corners[0], corners[1]]
              ];

    for (let i = 0; i < rails.length; i++) {
        if (rails[i][0].distance(eye) > rails[i][1].distance(eye)) {
            rails[i].reverse();
        }
    }

    return rails;
}

// Band quad between the rails, t in [0, 1] along each rail from its near end - plain interpolation, no
// roots and no clamping. The extremes return the original corners exactly, so a single area is the whole
// footprint verbatim and no orientation can degenerate. The previous construction cut the rails at eye
// distances, and at the nadir, where a rail's two ends sit at one distance, the cut collapsed the quad
// into a line and took the whole shadow with it.
function getAreaQuad(rails, t0, t1) {
    return [
        lerpPoint(rails[0][0], rails[0][1], t0),
        lerpPoint(rails[1][0], rails[1][1], t0),
        lerpPoint(rails[1][0], rails[1][1], t1),
        lerpPoint(rails[0][0], rails[0][1], t1)
    ];
}

// Eye distance of the band boundary at t, taken midway between the rails - what the split distribution is
// quoted against.
function getBoundaryDistance(rails, eye, t) {
    return lerpPoint(rails[0][0], rails[0][1], t)
        .addA(lerpPoint(rails[1][0], rails[1][1], t))
        .scale(0.5)
        .distance(eye);
}

// Rail parameter of boundary i of count, distributed as a geometric progression in eye distance. Distance
// runs near enough to linearly along a rail for the inverse to be this plain expression, which keeps the
// split free of roots and of the degeneracies they bring. Boundary 0 lands on 0 and boundary count on 1
// exactly, so the bands still tile the whole footprint. When the two ends sit at one distance - the nadir
// - there is no progression to build and even spacing is the answer.
//
// Even spacing is the wrong distribution everywhere else, and it is worth knowing why. A rail runs from
// the near corner to the far corner, and toward the horizon its far half is tens of kilometres, so an even
// quarter already swallows a 20 km deep band across a footprint that has fanned out to 40 km - which is
// why even spacing needs hundreds of bands before the nearest one is sharp. A band's texel grows in
// proportion to its distance, so equal distance *ratios* are what hand every band the same screen space
// quality, and four of those cover what hundreds of even ones could not.
function getAreaBoundaryT(index, count, nearDistance, farDistance) {
    let uniform = index / count;

    if (!(farDistance > nearDistance * 1.0001)) {
        return uniform;
    }

    return (nearDistance * Math.pow(farDistance / nearDistance, uniform) - nearDistance) / (farDistance - nearDistance);
}

// Every band of the split, nearest first - one ground quad each, and together they tile the whole
// footprint.
//
// The footprint is used whole while its own ground texel - its size over the shadow map resolution - keeps
// the reference target, see targetTexelSize. Once it does not, it divides into AREA_COUNT bands along the
// rails. The split is a function of the camera and the footprint only: the rails follow the eye distance
// gradient, so it survives roll and pitch, and the sun is kept out of the measure, see getAreaSpread. A
// single band is the original footprint corners exactly, by construction of getAreaQuad - no degenerate
// case to fall into.
function getFootprintAreas(mcam, corners) {
    let eye = mcam.eye;
    let rails = updateAreaRails(corners, eye);
    let footprintQuad = getAreaQuad(rails, 0.0, 1.0);
    let footprintTexel = getAreaSpread(footprintQuad) / SHADOW_MAP_SIZE;
    let target = shadowParams.targetTexelSize;

    if (!(target > 0.0)) {
        currentAreaSplitActive = true;
    } else {
        currentAreaSplitActive = currentAreaSplitActive
            ? footprintTexel > target
            : footprintTexel > target * AREA_SPLIT_TRIGGER_SLACK;
    }

    let count = currentAreaSplitActive ? AREA_COUNT : 1;
    let nearDistance = getBoundaryDistance(rails, eye, 0.0);
    let farDistance = getBoundaryDistance(rails, eye, 1.0);
    let areas = [];

    for (let i = 0; i < count; i++) {
        let t0 = getAreaBoundaryT(i, count, nearDistance, farDistance);
        let t1 = getAreaBoundaryT(i + 1, count, nearDistance, farDistance);

        areas.push(count === 1 ? footprintQuad : getAreaQuad(rails, t0, t1));
    }

    return areas;
}

// The proven single area fit, applied to one band. Each band owns its camera outright - its own light space
// basis, its own eye, its own snap rung - so nothing here has to be shared or reconciled across bands.
function fitAreaCamera(mcam, areaPoints, index) {
    let depthCamera = depthCameras[index];
    let shadowCamera = depthCamera.camera;

    // The quad only picks the ground positions; the elevations come from the rendered segments, so the
    // band stands on the terrain rather than on the reference surface it was cut on.
    //
    // The shadow camera is then fitted to that ground polygon, and to the visible terrain band around it,
    // sampled by walking each point along its own view ray through whatever relief the points do not
    // already account for, see getReceiverBoundsPoints. Terrain above can only pull that band toward the
    // camera, so it never widens the bounds; as a caster it only pushes the camera sunward, see
    // getCasterMinZ.
    let footprint = getBaseFootprint(getAreaGroundPoints(areaPoints));
    let lightDirection = globus.planet.sun.getPosition().normal().scale(-1.0);
    let lightUp = getStableLightUp(lightDirection);

    // The light space basis only depends on the light direction, so the camera is aimed first and moved
    // into its final place below, once the caster bounds are known.
    shadowCamera.set(footprint.center.sub(lightDirection), footprint.center, lightUp);

    let relief = getTerrainRelief(mcam, footprint, depthCamera);
    // Deliberately the view relief and not the depth one. What the depth camera's own traversal reports
    // depends on the bounds this height helps place, so feeding it back here closes a loop for no gain:
    // the caster clearance is an absolute hundred kilometres and swallows this term whole anyway.
    let casterHeight = getCasterHeight(footprint.radius, relief.up);

    let forward = shadowCamera.getForward();
    let right = shadowCamera.getRight();
    let up = shadowCamera.getUp();

    let bounds = getLightSpaceBounds(
        footprint.center,
        right,
        up,
        forward,
        getReceiverBoundsPoints(mcam, footprint, relief)
    );

    let orthoBounds = snapOrthographicBounds(expandOrthographicBounds(bounds), right, up, footprint.center, index);
    let casterMinZ = getCasterMinZ(footprint, forward, casterHeight);
    let casterClearance = Math.max(SHADOW_CASTER_CLEARANCE, casterHeight * SHADOW_CASTER_CLEARANCE_FACTOR);

    // Sunward offset from the footprint center that puts the near plane in front of the whole caster
    // volume. Bounds are measured from the center, so the offset is negative. This costs depth range
    // only: an orthographic camera moved along its own forward keeps the very same bounds.
    let eyeOffset = casterMinZ - SHADOW_CAMERA_NEAR - casterClearance;
    let eye = footprint.center.add(forward.scaleTo(eyeOffset));
    // The outward walk is capped laterally, the far plane is not: depth costs nothing here, so the
    // whole measured descent is reserved behind the receivers on top of the floor, whatever the walk
    // itself was allowed to reach, and from whichever of the two traversals reaches lower.
    let far = Math.max(
        SHADOW_CAMERA_NEAR + MIN_SHADOW_ORTHO_SIZE,
        bounds.maxZ + SHADOW_RECEIVER_DEPTH_PADDING + relief.depthDown - eyeOffset
    );

    shadowCamera.set(eye, eye.add(forward), lightUp);
    shadowCamera.frustum.setOrthoProjection(
        orthoBounds.left,
        orthoBounds.right,
        orthoBounds.bottom,
        orthoBounds.top,
        SHADOW_CAMERA_NEAR,
        far
    );
    shadowCamera.update();

    updateShadowBiases(depthCamera, orthoBounds);
}

// Both biases scale with the texel, and ShadowManager takes the same maximum side as the shadow texel
// size, see its texelWorldSize.
function updateShadowBiases(depthCamera, orthoBounds) {
    let texelWorldSize =
        Math.max(orthoBounds.right - orthoBounds.left, orthoBounds.top - orthoBounds.bottom) / SHADOW_MAP_SIZE;

    depthCamera.bias = texelWorldSize * SHADOW_DEPTH_BIAS_TEXELS;
    depthCamera.depthEpsilon = texelWorldSize * SHADOW_DEPTH_EPSILON_TEXELS;
}

// DepthCamera picks between two quad tree traversals per frame: its own, walked from the light, and the
// planet's, walked from the main camera. The choice turns on whether the shadow camera eye - a hundred
// kilometres sunward - falls inside the main frustum, so it flips as the camera turns. The two are not
// interchangeable for a depth pass, on two counts.
//
// The node list is indexed by the depth camera's current frustum, and a depth camera has exactly one, so
// the index is always zero. The planet's list is split across the *main* camera's frustums, so index zero
// is only its nearest slice: rendering the planet's traversal fills the map with the near band of the main
// view alone and drops all the far terrain, which is most of the map.
//
// And the depth pass drops every segment failing `_transitionOpacity >= 1`, drawing
// `_fadingOpaqueSegments` in their place - a list filled by the planet's colour pass, which runs after
// predraw and only ever fills it for the planet's own strategy. The depth camera's traversal has
// transitions disabled, so all its segments sit at opacity 1 and the gate never bites; the planet's has
// them enabled, so every segment mid cross-fade is dropped and replaced from a list that is a frame stale
// at best and empty at worst. A hole in the depth map for the length of each tile fade.
//
// Pinning costs nothing real: terrain the main camera does not look at is exactly what the planet's
// traversal would be missing anyway. It also settles `updateCameraSlope` and the skirt decision riding on
// it. The proper fix belongs in the library - a depth pass has no business honouring a colour cross-fade,
// since depth does not blend and drawing both sides of a fade is harmless when the test keeps the nearer.
//
// The flag is consumed by the pass it pins, so it has to be set every frame, and per band: the planet's
// list is indexed by the main camera's frustums and would hand a band the wrong slice of nodes.
function pinQuadTreeTraversal() {
    for (let i = 0; i < depthCameras.length; i++) {
        depthCameras[i]._forceOwnQuadTreeStrategyPass = true;
    }
}

// Corner markers on the reference surface, cyan rays dropping to the terrain under them, and the yellow
// contour through the terrain points, for one band.
function updateAreaDebug(areaPoints) {
    let grounds = getAreaGroundPoints(areaPoints);

    for (let i = 0; i < areaPoints.length; i++) {
        let rayEntity = footprintGroundRays[i];

        rayEntity.setVisibility(true);
        rayEntity.ray.setStartPosition3v(areaPoints[i]);
        rayEntity.ray.setEndPosition3v(grounds[i]);
    }

    footprintContour.setVisibility(true);
    footprintContour.polyline.setPath3v([[...grounds, grounds[0]]], undefined, true);
}

function hideFootprintDebug() {
    for (let i = 0; i < AREA_QUAD_POINTS; i++) {
        footprintMarkers[i].setVisibility(false);
        footprintGroundRays[i].setVisibility(false);
    }

    footprintContour.setVisibility(false);
}

function updateShadowCamera() {
    let mcam = globus.planet.camera;

    updateFootprintEllipsoid(mcam);

    let corners = getCameraFootprint(mcam);

    if (!(corners[0] && corners[1] && corners[2] && corners[3])) {
        hideFootprintDebug();
        return;
    }

    let areas = getFootprintAreas(mcam, corners);

    for (let i = 0; i < AREA_COUNT; i++) {
        let isActive = i < areas.length;

        // A band with no area of its own is switched off rather than left holding a stale fit: shadows.glsl
        // multiplies every active map in, so a leftover would keep darkening ground it no longer describes.
        // Its depth camera goes with it, so an unsplit frame renders one map instead of AREA_COUNT.
        shadowMaps[i].enabled = isActive;
        depthCameras[i].enabled = isActive;

        if (isActive) {
            fitAreaCamera(mcam, areas[i], i);
        }
    }

    // Last, because every band moves the markers onto its own corners to read the terrain under them, see
    // getAreaGroundPoints.
    updateAreaDebug(areas[Math.min(Math.max(0, Math.round(shadowParams.areaIndex)), areas.length - 1)]);
    pinQuadTreeTraversal();
}

// Where the fit sits among the predraw handlers, which run in descending priority order. Both placements
// leave something mismatched, and neither is free.
//
// DepthCameraHandler renders the map at priority 0, the navigation moves the main camera at -10000, and
// the planet updates that camera during the draw event afterwards. Above 0 the fit runs before the render,
// so the depth texture and the matrices the shading pass reads at uniform time - see
// ShadowManager.bindForward - are the same ones, and what lags instead is the fitted region, by the frame
// of camera motion the navigation has not applied yet. Below 0 the fit runs after the render: the region is
// just as stale, and on top of that the texture holds the previous fit while the shading pass samples it
// through the current one.
const SHADOW_CAMERA_PREDRAW_PRIORITY = -1;

globus.planet.renderer.events.on("predraw", updateShadowCamera, null, SHADOW_CAMERA_PREDRAW_PRIORITY);

const MAIN_CAMERA_ROLL_STEP = (1.5 * Math.PI) / 180.0;

globus.planet.renderer.events.on("keypress", input.KEY_Q, () => {
    let mcam = globus.planet.camera;
    mcam.setRoll(mcam.getRoll() - MAIN_CAMERA_ROLL_STEP);
    mcam.update();
});

globus.planet.renderer.events.on("keypress", input.KEY_E, () => {
    let mcam = globus.planet.camera;
    mcam.setRoll(mcam.getRoll() + MAIN_CAMERA_ROLL_STEP);
    mcam.update();
});

window.shadowMapSandbox = {
    globus,
    depthCameras,
    shadowMaps,
    params: shadowParams
};
