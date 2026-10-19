import {proj4} from "./proj4";

const EPSG_IO_URL = "https://epsg.io";
const PROJ_DEFINITIONS = new Map<number, string | null>();

async function fetchProjDefinition(crsCode: number): Promise<string | null> {
    if (PROJ_DEFINITIONS.has(crsCode)) {
        return PROJ_DEFINITIONS.get(crsCode)!;
    }

    let definition: string | null = null;

    try {
        const response = await fetch(`${EPSG_IO_URL}/${crsCode}.proj4`);
        if (response.ok) {
            const text = (await response.text()).trim();
            if (text.indexOf("+proj=") === 0) {
                definition = text;
            }
        }
    } catch (err) {
        console.warn(`[EPSG] Unable to reach ${EPSG_IO_URL} for EPSG:${crsCode}.`, err);
        return null;
    }

    PROJ_DEFINITIONS.set(crsCode, definition);

    return definition;
}

/**
 * Registers the CRS in {@link proj4}, taking its definition from epsg.io. Returns whether the
 * projection became available, i.e. whether the data in that CRS is worth reading again.
 */
export async function defineProjection(crsCode: number): Promise<boolean> {
    if (typeof proj4?.defs !== "function") {
        return false;
    }

    const definition = await fetchProjDefinition(crsCode);

    if (!definition) {
        return false;
    }

    proj4.defs(`EPSG:${crsCode}`, definition);

    return true;
}
