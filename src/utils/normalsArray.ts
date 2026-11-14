/// <reference lib="esnext.float16" preserve="true" />

/**
 * The normals of the normal map: Float16Array where the browser has it, half the memory, Float32Array otherwise.
 */
export type NormalsArray = Float16Array | Float32Array;

export const NormalsArray: typeof Float16Array | typeof Float32Array =
    typeof Float16Array !== "undefined" ? Float16Array : Float32Array;
