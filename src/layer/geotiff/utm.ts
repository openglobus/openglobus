/**
 * High precision Transverse Mercator (UTM) forward & inverse projection for WGS84 ellipsoid.
 * Supports EPSG:32601 - EPSG:32660 (UTM North zones 1N-60N)
 * and EPSG:32701 - EPSG:32760 (UTM South zones 1S-60S).
 */

const WGS84_A = 6378137.0;
const WGS84_F = 1.0 / 298.257223563;
const WGS84_E2 = 2 * WGS84_F - WGS84_F * WGS84_F;
const WGS84_E_PRIME2 = WGS84_E2 / (1.0 - WGS84_E2);
const UTM_K0 = 0.9996;

/**
 * Projects WGS84 LonLat degrees [lon, lat] to UTM coordinates [easting, northing] in meters.
 */
export function forwardUTM(lon: number, lat: number, zone: number, isNorth: boolean): [number, number] {
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    const centralLonRad = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);
    const dLon = lonRad - centralLonRad;

    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const tanLat = Math.tan(latRad);

    const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
    const T = tanLat * tanLat;
    const C = WGS84_E_PRIME2 * cosLat * cosLat;
    const A = cosLat * dLon;

    const M =
        WGS84_A *
        ((1 - WGS84_E2 / 4 - (3 * WGS84_E2 * WGS84_E2) / 64 - (5 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 256) * latRad -
            ((3 * WGS84_E2) / 8 + (3 * WGS84_E2 * WGS84_E2) / 32 + (45 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 1024) *
                Math.sin(2 * latRad) +
            ((15 * WGS84_E2 * WGS84_E2) / 256 + (45 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 1024) *
                Math.sin(4 * latRad) -
            ((35 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 3072) * Math.sin(6 * latRad));

    const x =
        UTM_K0 *
            N *
            (A +
                ((1 - T + C) * Math.pow(A, 3)) / 6 +
                ((5 - 18 * T + T * T + 72 * C - 58 * WGS84_E_PRIME2) * Math.pow(A, 5)) / 120) +
        500000;

    let y =
        UTM_K0 *
        (M +
            N *
                tanLat *
                (Math.pow(A, 2) / 2 +
                    ((5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4)) / 24 +
                    ((61 - 58 * T + T * T + 600 * C - 330 * WGS84_E_PRIME2) * Math.pow(A, 6)) / 720));

    if (!isNorth) {
        y += 10000000;
    }

    return [x, y];
}

/**
 * Unprojects UTM coordinates [easting, northing] in meters to WGS84 [lon, lat] in degrees.
 */
export function inverseUTM(x: number, y: number, zone: number, isNorth: boolean): [number, number] {
    const e1 = (1 - Math.sqrt(1 - WGS84_E2)) / (1 + Math.sqrt(1 - WGS84_E2));
    const xAdj = x - 500000;
    const yAdj = isNorth ? y : y - 10000000;

    const M = yAdj / UTM_K0;
    const mu = M / (WGS84_A * (1 - WGS84_E2 / 4 - (3 * WGS84_E2 * WGS84_E2) / 64 - (5 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 256));

    const phi1Rad =
        mu +
        ((3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32) * Math.sin(2 * mu) +
        ((21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32) * Math.sin(4 * mu) +
        ((151 * Math.pow(e1, 3)) / 96) * Math.sin(6 * mu) +
        ((1097 * Math.pow(e1, 4)) / 512) * Math.sin(8 * mu);

    const sinPhi1 = Math.sin(phi1Rad);
    const cosPhi1 = Math.cos(phi1Rad);
    const tanPhi1 = Math.tan(phi1Rad);

    const N1 = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinPhi1 * sinPhi1);
    const T1 = tanPhi1 * tanPhi1;
    const C1 = WGS84_E_PRIME2 * cosPhi1 * cosPhi1;
    const R1 = (WGS84_A * (1 - WGS84_E2)) / Math.pow(1 - WGS84_E2 * sinPhi1 * sinPhi1, 1.5);
    const D = xAdj / (N1 * UTM_K0);

    const latRad =
        phi1Rad -
        ((N1 * tanPhi1) / R1) *
            ((D * D) / 2 -
                ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * WGS84_E_PRIME2) * Math.pow(D, 4)) / 24 +
                ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * WGS84_E_PRIME2 - 3 * C1 * C1) * Math.pow(D, 6)) /
                    720);

    const centralLon = (zone - 1) * 6 - 180 + 3;
    const lonRad =
        (D -
            ((1 + 2 * T1 + C1) * Math.pow(D, 3)) / 6 +
            ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * WGS84_E_PRIME2 + 24 * T1 * T1) * Math.pow(D, 5)) / 120) /
        cosPhi1;

    return [centralLon + (lonRad * 180) / Math.PI, (latRad * 180) / Math.PI];
}

export interface IProjectionHelper {
    project: (p: number[]) => number[];
    unproject: (p: number[]) => number[];
}

/**
 * Returns a projection helper { project, unproject } if the given code is a supported UTM EPSG code
 * (EPSG:32601-32660 or EPSG:32701-32760), or if proj4 is globally registered.
 */
export function getProjectionHelper(
    crsCode: number,
    customProjFunc?: (code: number) => IProjectionHelper | undefined
): IProjectionHelper | null {
    if (customProjFunc) {
        const p = customProjFunc(crsCode);
        if (p) return p;
    }

    // Check UTM North (32601 - 32660)
    if (crsCode >= 32601 && crsCode <= 32660) {
        const zone = crsCode - 32600;
        return {
            project: (p: number[]) => forwardUTM(p[0], p[1], zone, true),
            unproject: (p: number[]) => inverseUTM(p[0], p[1], zone, true)
        };
    }

    // Check UTM South (32701 - 32760)
    if (crsCode >= 32701 && crsCode <= 32760) {
        const zone = crsCode - 32700;
        return {
            project: (p: number[]) => forwardUTM(p[0], p[1], zone, false),
            unproject: (p: number[]) => inverseUTM(p[0], p[1], zone, false)
        };
    }

    // Check global proj4
    const globalProj4 =
        (typeof window !== "undefined" && (window as any).proj4) ||
        (typeof globalThis !== "undefined" && (globalThis as any).proj4);

    if (globalProj4 && typeof globalProj4 === "function") {
        try {
            const epsgStr = `EPSG:${crsCode}`;
            return {
                project: (p: number[]) => globalProj4("EPSG:4326", epsgStr, p),
                unproject: (p: number[]) => globalProj4(epsgStr, "EPSG:4326", p)
            };
        } catch {
            return null;
        }
    }

    return null;
}
