import { Vec3 } from "../math/Vec3";
import type { NumberArray3 } from "../math/Vec3";

export const LINEAR = 0;
export const SRGB = 1;

export function getColorSpace(colorSpace?: string | number, defaultColorSpace: number = LINEAR): number {
    if (colorSpace === LINEAR || colorSpace === SRGB) {
        return colorSpace;
    }

    if (typeof colorSpace === "string") {
        const value = colorSpace.trim().toLowerCase();
        if (value === "linear") {
            return LINEAR;
        }
        if (value === "srgb") {
            return SRGB;
        }
    }

    return defaultColorSpace;
}

export function srgbToLinearArr(arr: NumberArray3): NumberArray3 {
    return [srgbToLinear(arr[0]), srgbToLinear(arr[1]), srgbToLinear(arr[2])];
}

export function srgbToLinear3v(v: Vec3): NumberArray3 {
    return [srgbToLinear(v.x), srgbToLinear(v.y), srgbToLinear(v.z)];
}

export function srgbToLinear(v: number): number {
    const c = v > 1.0 ? v / 255.0 : v;
    return Math.pow(c, 2.2);
}
