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
    return [Math.pow(arr[0], 2.2), Math.pow(arr[1], 2.2), Math.pow(arr[2], 2.2)];
}

export function srgbToLinear3v(v: Vec3): NumberArray3 {
    return [Math.pow(v.x, 2.2), Math.pow(v.y, 2.2), Math.pow(v.z, 2.2)];
}

export function srgbToLinear(v: number): number {
    return Math.pow(v, 2.2);
}

export function linearToSrgbArr(arr: NumberArray3): NumberArray3 {
    return [Math.pow(arr[0], 1.0 / 2.2), Math.pow(arr[1], 1.0 / 2.2), Math.pow(arr[2], 1.0 / 2.2)];
}
