export const SHADE_UNLIT = 0;
export const SHADE_PHONG = 0.5;
export const SHADE_PBR = 1;

export type ShadeMode = typeof SHADE_UNLIT | typeof SHADE_PHONG | typeof SHADE_PBR;
export type ShadeModeString = "none" | "unlit" | "phong" | "pbr";
export type ShadeModeInput = ShadeMode | ShadeModeString;

const SHADE_BY_NAME: Readonly<Record<ShadeModeString, ShadeMode>> = {
    none: SHADE_UNLIT,
    unlit: SHADE_UNLIT,
    phong: SHADE_PHONG,
    pbr: SHADE_PBR
};

export function normalizeShadeMode(mode: ShadeModeInput): ShadeMode {
    if (typeof mode === "string") {
        const byName = SHADE_BY_NAME[mode];
        if (byName !== undefined) {
            return byName;
        }
        return SHADE_PHONG;
    }

    if (mode === SHADE_UNLIT || mode === SHADE_PHONG || mode === SHADE_PBR) {
        return mode;
    }

    return SHADE_PHONG;
}
