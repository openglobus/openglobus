import { Globe, OpenStreetMap, GeoTIFFLayer, GlobusRgbTerrain } from "../../lib/og.es.js";

// =========================================================================
// 1. Projection Constants Calculation (Clarke 1866 / NAD27 + AEA Metadata)
// =========================================================================
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// Ellipsoid Constants (Clarke 1866)
const a = 6378206.4;
const b = 6356583.8;
const e2 = 1 - (b * b) / (a * a);
const e = Math.sqrt(e2);

// Metadata Parameters
const phi1 = 33.903634 * DEG_TO_RAD; // Standard Parallel 1
const phi2 = 33.62529 * DEG_TO_RAD; // Standard Parallel 2
const phi0 = 33.764462 * DEG_TO_RAD; // Latitude of Origin
const lambda0 = -117.474543 * DEG_TO_RAD; // Central Meridian
const FE = 0; // False Easting
const FN = 0; // False Northing

// Helper: Calculate q(phi) for Albers Equal Area
function calcQ(phi) {
    const sinPhi = Math.sin(phi);
    const con = e * sinPhi;
    return (1 - e2) * (sinPhi / (1 - con * con) - (1 / (2 * e)) * Math.log((1 - con) / (1 + con)));
}

// Helper: Calculate m(phi)
function calcM(phi) {
    const sinPhi = Math.sin(phi);
    return Math.cos(phi) / Math.sqrt(1 - e2 * sinPhi * sinPhi);
}

// Derive AEA Constants (q0, q1, q2, m1, m2, n, C, rho0)
const q0 = calcQ(phi0);
const q1 = calcQ(phi1);
const q2 = calcQ(phi2);
const m1 = calcM(phi1);
const m2 = calcM(phi2);

// Cone constant (n)
const n = (m1 * m1 - m2 * m2) / (q2 - q1);
// Authalic constant (C)
const C = m1 * m1 + n * q1;
// Radius at latitude of origin (rho0)
const rho0 = (a * Math.sqrt(C - n * q0)) / n;

// =========================================================================
// 2. FORWARD PROJECTION (project): [Lon, Lat] -> [X, Y] (meters)
// =========================================================================
function project(lon, lat) {
    const phi = lat * DEG_TO_RAD;
    const lambda = lon * DEG_TO_RAD;

    const q = calcQ(phi);
    const rho = (a * Math.sqrt(C - n * q)) / n;
    const theta = n * (lambda - lambda0);

    const x = FE + rho * Math.sin(theta);
    const y = FN + rho0 - rho * Math.cos(theta);

    return [x, y];
}

// =========================================================================
// 3. INVERSE PROJECTION (unproject): [X, Y] (meters) -> [Lon, Lat]
// =========================================================================
function unproject(x, y) {
    const dx = x - FE;
    const dy = rho0 - (y - FN);

    const rho = Math.sign(n) * Math.sqrt(dx * dx + dy * dy);
    const theta = Math.atan2(dx, dy);

    const q = (C - (rho * rho * n * n) / (a * a)) / n;
    const lambda = theta / n + lambda0;

    // Newton-Raphson iteration to solve latitude (phi) from q
    let phi = Math.asin(q / 2); // Initial guess
    for (let i = 0; i < 6; i++) {
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        const con = e * sinPhi;

        const qCurrent = calcQ(phi);
        const dq_dphi = (2 * cosPhi * (1 - e2)) / Math.pow(1 - con * con, 2);

        const delta = (q - qCurrent) / dq_dphi;
        phi += delta;

        if (Math.abs(delta) < 1e-12) break;
    }
    const lon = lambda * RAD_TO_DEG;
    const lat = phi * RAD_TO_DEG;
    return [lon, lat];
}

const customProjFunc = (code) => {
    return {
        project: (point) => {
            return project(point[0], point[1]);
        },
        unproject: (point) => {
            return unproject(point[0], point[1]);
        }
    };
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

const layer = new GeoTIFFLayer(" Custom projectionCOG", {
    src: "https://download.osgeo.org/geotiff/samples/pci_eg/acea.tif",
    // pass 99999 as a custom CRS code to indicate that this is a custom projection.
    crs: 99999,
    projFunc: customProjFunc,
    renderOptions: {
        single: {
            band: 1,
            colorScale: "inferno"
        }
    }
});

globe.planet.addLayer(layer);
await layer.whenReady();
flyToLayer();

function flyToLayer() {
    const extent = layer.getExtent();
    if (extent) {
        globe.planet.flyExtent(extent);
    }
}
