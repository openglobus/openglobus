import type { ColorScaleName, ColorStop, IMultiBandRenderOptions, ISingleBandRenderOptions } from "./types";

export type TypedRasterArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array
    | number[];

interface ColorScaleDefinition {
    colors: string[] | Uint8Array;
    positions?: number[];
}

export const COLORSCALES: Record<string, ColorScaleDefinition> = {
    viridis: {
        colors: new Uint8Array([
            68, 1, 84, 255, 68, 2, 86, 255, 69, 4, 87, 255, 69, 5, 89, 255, 70, 7, 90, 255, 70, 8, 92, 255, 70, 10, 93,
            255, 70, 11, 94, 255, 71, 13, 96, 255, 71, 14, 97, 255, 71, 16, 99, 255, 71, 17, 100, 255, 71, 19, 101, 255,
            72, 20, 103, 255, 72, 22, 104, 255, 72, 23, 105, 255, 72, 24, 106, 255, 72, 26, 108, 255, 72, 27, 109, 255,
            72, 28, 110, 255, 72, 29, 111, 255, 72, 31, 112, 255, 72, 32, 113, 255, 72, 33, 115, 255, 72, 35, 116, 255,
            72, 36, 117, 255, 72, 37, 118, 255, 72, 38, 119, 255, 72, 40, 120, 255, 72, 41, 121, 255, 71, 42, 122, 255,
            71, 44, 122, 255, 71, 45, 123, 255, 71, 46, 124, 255, 71, 47, 125, 255, 70, 48, 126, 255, 70, 50, 126, 255,
            70, 51, 127, 255, 70, 52, 128, 255, 69, 53, 129, 255, 69, 55, 129, 255, 69, 56, 130, 255, 68, 57, 131, 255,
            68, 58, 131, 255, 68, 59, 132, 255, 67, 61, 132, 255, 67, 62, 133, 255, 66, 63, 133, 255, 66, 64, 134, 255,
            66, 65, 134, 255, 65, 66, 135, 255, 65, 68, 135, 255, 64, 69, 136, 255, 64, 70, 136, 255, 63, 71, 136, 255,
            63, 72, 137, 255, 62, 73, 137, 255, 62, 74, 137, 255, 62, 76, 138, 255, 61, 77, 138, 255, 61, 78, 138, 255,
            60, 79, 138, 255, 60, 80, 139, 255, 59, 81, 139, 255, 59, 82, 139, 255, 58, 83, 139, 255, 58, 84, 140, 255,
            57, 85, 140, 255, 57, 86, 140, 255, 56, 88, 140, 255, 56, 89, 140, 255, 55, 90, 140, 255, 55, 91, 141, 255,
            54, 92, 141, 255, 54, 93, 141, 255, 53, 94, 141, 255, 53, 95, 141, 255, 52, 96, 141, 255, 52, 97, 141, 255,
            51, 98, 141, 255, 51, 99, 141, 255, 50, 100, 142, 255, 50, 101, 142, 255, 49, 102, 142, 255, 49, 103, 142,
            255, 49, 104, 142, 255, 48, 105, 142, 255, 48, 106, 142, 255, 47, 107, 142, 255, 47, 108, 142, 255, 46, 109,
            142, 255, 46, 110, 142, 255, 46, 111, 142, 255, 45, 112, 142, 255, 45, 113, 142, 255, 44, 113, 142, 255, 44,
            114, 142, 255, 44, 115, 142, 255, 43, 116, 142, 255, 43, 117, 142, 255, 42, 118, 142, 255, 42, 119, 142,
            255, 42, 120, 142, 255, 41, 121, 142, 255, 41, 122, 142, 255, 41, 123, 142, 255, 40, 124, 142, 255, 40, 125,
            142, 255, 39, 126, 142, 255, 39, 127, 142, 255, 39, 128, 142, 255, 38, 129, 142, 255, 38, 130, 142, 255, 38,
            130, 142, 255, 37, 131, 142, 255, 37, 132, 142, 255, 37, 133, 142, 255, 36, 134, 142, 255, 36, 135, 142,
            255, 35, 136, 142, 255, 35, 137, 142, 255, 35, 138, 141, 255, 34, 139, 141, 255, 34, 140, 141, 255, 34, 141,
            141, 255, 33, 142, 141, 255, 33, 143, 141, 255, 33, 144, 141, 255, 33, 145, 140, 255, 32, 146, 140, 255, 32,
            146, 140, 255, 32, 147, 140, 255, 31, 148, 140, 255, 31, 149, 139, 255, 31, 150, 139, 255, 31, 151, 139,
            255, 31, 152, 139, 255, 31, 153, 138, 255, 31, 154, 138, 255, 30, 155, 138, 255, 30, 156, 137, 255, 30, 157,
            137, 255, 31, 158, 137, 255, 31, 159, 136, 255, 31, 160, 136, 255, 31, 161, 136, 255, 31, 161, 135, 255, 31,
            162, 135, 255, 32, 163, 134, 255, 32, 164, 134, 255, 33, 165, 133, 255, 33, 166, 133, 255, 34, 167, 133,
            255, 34, 168, 132, 255, 35, 169, 131, 255, 36, 170, 131, 255, 37, 171, 130, 255, 37, 172, 130, 255, 38, 173,
            129, 255, 39, 173, 129, 255, 40, 174, 128, 255, 41, 175, 127, 255, 42, 176, 127, 255, 44, 177, 126, 255, 45,
            178, 125, 255, 46, 179, 124, 255, 47, 180, 124, 255, 49, 181, 123, 255, 50, 182, 122, 255, 52, 182, 121,
            255, 53, 183, 121, 255, 55, 184, 120, 255, 56, 185, 119, 255, 58, 186, 118, 255, 59, 187, 117, 255, 61, 188,
            116, 255, 63, 188, 115, 255, 64, 189, 114, 255, 66, 190, 113, 255, 68, 191, 112, 255, 70, 192, 111, 255, 72,
            193, 110, 255, 74, 193, 109, 255, 76, 194, 108, 255, 78, 195, 107, 255, 80, 196, 106, 255, 82, 197, 105,
            255, 84, 197, 104, 255, 86, 198, 103, 255, 88, 199, 101, 255, 90, 200, 100, 255, 92, 200, 99, 255, 94, 201,
            98, 255, 96, 202, 96, 255, 99, 203, 95, 255, 101, 203, 94, 255, 103, 204, 92, 255, 105, 205, 91, 255, 108,
            205, 90, 255, 110, 206, 88, 255, 112, 207, 87, 255, 115, 208, 86, 255, 117, 208, 84, 255, 119, 209, 83, 255,
            122, 209, 81, 255, 124, 210, 80, 255, 127, 211, 78, 255, 129, 211, 77, 255, 132, 212, 75, 255, 134, 213, 73,
            255, 137, 213, 72, 255, 139, 214, 70, 255, 142, 214, 69, 255, 144, 215, 67, 255, 147, 215, 65, 255, 149,
            216, 64, 255, 152, 216, 62, 255, 155, 217, 60, 255, 157, 217, 59, 255, 160, 218, 57, 255, 162, 218, 55, 255,
            165, 219, 54, 255, 168, 219, 52, 255, 170, 220, 50, 255, 173, 220, 48, 255, 176, 221, 47, 255, 178, 221, 45,
            255, 181, 222, 43, 255, 184, 222, 41, 255, 186, 222, 40, 255, 189, 223, 38, 255, 192, 223, 37, 255, 194,
            223, 35, 255, 197, 224, 33, 255, 200, 224, 32, 255, 202, 225, 31, 255, 205, 225, 29, 255, 208, 225, 28, 255,
            210, 226, 27, 255, 213, 226, 26, 255, 216, 226, 25, 255, 218, 227, 25, 255, 221, 227, 24, 255, 223, 227, 24,
            255, 226, 228, 24, 255, 229, 228, 25, 255, 231, 228, 25, 255, 234, 229, 26, 255, 236, 229, 27, 255, 239,
            229, 28, 255, 241, 229, 29, 255, 244, 230, 30, 255, 246, 230, 32, 255, 248, 230, 33, 255, 251, 231, 35, 255,
            253, 231, 37, 255
        ])
    },
    turbo: {
        colors: [
            "#30123b",
            "#321543",
            "#33184a",
            "#341b51",
            "#351e58",
            "#36215f",
            "#372466",
            "#38276d",
            "#392a73",
            "#3a2d79",
            "#3b2f80",
            "#3c3286",
            "#3d358b",
            "#3e3891",
            "#3f3b97",
            "#3f3e9c",
            "#4040a2",
            "#4143a7",
            "#4146ac",
            "#4249b1",
            "#424bb5",
            "#434eba",
            "#4451bf",
            "#4454c3",
            "#4456c7",
            "#4559cb",
            "#455ccf",
            "#455ed3",
            "#4661d6",
            "#4664da",
            "#4666dd",
            "#4669e0",
            "#466be3",
            "#476ee6",
            "#4771e9",
            "#4773eb",
            "#4776ee",
            "#4778f0",
            "#477bf2",
            "#467df4",
            "#4680f6",
            "#4682f8",
            "#4685fa",
            "#4687fb",
            "#458afc",
            "#458cfd",
            "#448ffe",
            "#4391fe",
            "#4294ff",
            "#4196ff",
            "#4099ff",
            "#3e9bfe",
            "#3d9efe",
            "#3ba0fd",
            "#3aa3fc",
            "#38a5fb",
            "#37a8fa",
            "#35aaf8",
            "#33acf7",
            "#31aff5",
            "#2fb1f4",
            "#2eb3f2",
            "#2cb6f0",
            "#2ab8ee",
            "#28baeb",
            "#27bde9",
            "#25bfe7",
            "#23c1e4",
            "#22c3e2",
            "#20c5df",
            "#1fc7dd",
            "#1ec9da",
            "#1ccbd8",
            "#1bced5",
            "#1ad0d2",
            "#19d2d0",
            "#18d4cd",
            "#18d5cb",
            "#17d7c8",
            "#17d9c5",
            "#17dbc2",
            "#17ddc0",
            "#17dfbd",
            "#17e0ba",
            "#18e2b8",
            "#19e3b5",
            "#1ae4b2",
            "#1ce6af",
            "#1de7ac",
            "#1fe8a9",
            "#20e9a6",
            "#22eba3",
            "#25eca0",
            "#27eda0",
            "#2aeea0",
            "#2ceea0",
            "#2feea0",
            "#32eea0",
            "#35efa0",
            "#38efa0",
            "#3befa0",
            "#3eefa0",
            "#42eea0",
            "#45eea0",
            "#48eea0",
            "#4beea0",
            "#4eeea0",
            "#51eda0",
            "#55eda0",
            "#58eda0",
            "#5beca0",
            "#5eeca0",
            "#62eca0",
            "#65eba0",
            "#69eba0",
            "#6ceaa0",
            "#70eaa0",
            "#73e9a0",
            "#77e8a0",
            "#7ae8a0",
            "#7ee7a0",
            "#81e6a0",
            "#85e5a0",
            "#89e4a0",
            "#8ce3a0",
            "#90e2a0",
            "#94e1a0",
            "#97e0a0",
            "#9bdfa0",
            "#9fdda0",
            "#a2dca0",
            "#a6dba0",
            "#a9d9a0",
            "#add8a0",
            "#b0d6a0",
            "#b4d5a0",
            "#b7d3a0",
            "#bbd2a0",
            "#bed0a0",
            "#c1cea0",
            "#c5cda0",
            "#c8cba0",
            "#cbc9a0",
            "#cec7a0",
            "#d1c5a0",
            "#d4c3a0",
            "#d7c1a0",
            "#d9bfa0",
            "#dcbea0",
            "#dfbca0",
            "#e1baa0",
            "#e4b8a0",
            "#e6b6a0",
            "#e8b4a0",
            "#ebb2a0",
            "#edb0a0",
            "#efaea0",
            "#f1aca0",
            "#f3aaa0",
            "#f5a8a0",
            "#f6a6a0",
            "#f8a4a0",
            "#f9a2a0",
            "#fba0a0",
            "#fc9ea0",
            "#fd9ca0",
            "#fe9aa0",
            "#ff98a0",
            "#ff96a0",
            "#ff94a0"
        ]
    },
    inferno: {
        colors: [
            "#000004",
            "#010005",
            "#010106",
            "#010108",
            "#02010a",
            "#02020c",
            "#02020e",
            "#030210",
            "#040312",
            "#040314",
            "#050417",
            "#060419",
            "#07051b",
            "#08051d",
            "#09061f",
            "#0a0722",
            "#0b0724",
            "#0c0826",
            "#0d0829",
            "#0e092b",
            "#10092d",
            "#110a30",
            "#120a32",
            "#140b34",
            "#150b37",
            "#160b39",
            "#180c3c",
            "#190c3e",
            "#1b0c41",
            "#1c0c43",
            "#1e0c45",
            "#1f0c48",
            "#210c4a",
            "#230c4c",
            "#240c4f",
            "#260c51",
            "#280b53",
            "#290b55",
            "#2b0b57",
            "#2d0b59",
            "#2f0a5b",
            "#310a5c",
            "#320a5e",
            "#340a5f",
            "#360961",
            "#380962",
            "#390963",
            "#3b0964",
            "#3d0965",
            "#3e0966",
            "#400a67",
            "#420a68",
            "#440a68",
            "#450a69",
            "#470b6a",
            "#490b6a",
            "#4a0c6b",
            "#4c0c6b",
            "#4d0d6c",
            "#4f0d6c",
            "#510e6c",
            "#520e6d",
            "#540f6d",
            "#550f6d",
            "#57106e",
            "#59106e",
            "#5a116e",
            "#5c126e",
            "#5d126e",
            "#5f136e",
            "#61136e",
            "#62146e",
            "#64156e",
            "#65156e",
            "#67166e",
            "#69166e",
            "#6a176e",
            "#6c186e",
            "#6d186e",
            "#6f196e",
            "#71196e",
            "#721a6e",
            "#741a6e",
            "#751b6e",
            "#771c6d",
            "#781c6d",
            "#7a1d6d",
            "#7c1d6d",
            "#7d1e6d",
            "#7f1e6c",
            "#801f6c",
            "#82206c",
            "#84206b",
            "#85216b",
            "#87216b",
            "#88226a",
            "#8a226a",
            "#8c2369",
            "#8d2369",
            "#8f2469",
            "#902568",
            "#922568",
            "#932667",
            "#952667",
            "#972766",
            "#982766",
            "#9a2865",
            "#9b2964",
            "#9d2964",
            "#9f2a63",
            "#a02a63",
            "#a22b62",
            "#a32c61",
            "#a52c60",
            "#a62d60",
            "#a82e5f",
            "#a92e5e",
            "#ab2f5e",
            "#ad305d",
            "#ae305c",
            "#b0315b",
            "#b1325a",
            "#b3325a",
            "#b43359",
            "#b63458",
            "#b73557",
            "#b93556",
            "#ba3655",
            "#bc3754",
            "#bd3853",
            "#bf3952",
            "#c03a51",
            "#c13a50",
            "#c33b4f",
            "#c43c4e",
            "#c63d4d",
            "#c73e4c",
            "#c83f4b",
            "#ca404a",
            "#cb4149",
            "#cc4248",
            "#ce4347",
            "#cf4446",
            "#d04545",
            "#d24644",
            "#d34743",
            "#d44842",
            "#d54a41",
            "#d74b3f",
            "#d84c3e",
            "#d94d3d",
            "#da4e3c",
            "#db503b",
            "#dc513a",
            "#de5238",
            "#df5337",
            "#e05536",
            "#e15635",
            "#e25734",
            "#e35933",
            "#e45a31",
            "#e55c30",
            "#e65d2f",
            "#e75e2e",
            "#e8602d",
            "#e9612b",
            "#ea632a",
            "#eb6429",
            "#eb6628",
            "#ec6726",
            "#ed6925",
            "#ee6a24",
            "#ef6c23",
            "#ef6e21",
            "#f06f20",
            "#f1711f",
            "#f1731d",
            "#f2741c",
            "#f3761b",
            "#f37819",
            "#f47918",
            "#f57b17",
            "#f57d15",
            "#f67e14",
            "#f68013",
            "#f78212",
            "#f78410",
            "#f8850f",
            "#f8870e",
            "#f8890c",
            "#f98b0b",
            "#f98c0a",
            "#f98e09",
            "#fa9008",
            "#fa9207",
            "#fa9407",
            "#fb9606",
            "#fb9706",
            "#fb9906",
            "#fb9b06",
            "#fb9d07",
            "#fc9f07",
            "#fca108",
            "#fca309",
            "#fca50a",
            "#fca60c",
            "#fca80d",
            "#fcaa0f",
            "#fcac11",
            "#fcae12",
            "#fcb014",
            "#fcb216",
            "#fcb418",
            "#fbb61a",
            "#fbb81d",
            "#fbbb1f",
            "#fbbd21",
            "#fbbf23",
            "#fbc126",
            "#fac328",
            "#fac52b",
            "#fac72d",
            "#f9c930",
            "#f9cb33",
            "#f8cd35",
            "#f8cf38",
            "#f7d13b",
            "#f7d33e",
            "#f6d541",
            "#f6d744",
            "#f5d947",
            "#f5db4a",
            "#f4dd4d",
            "#f4df51",
            "#f3e154",
            "#f3e357",
            "#f3e55a",
            "#f2e75e",
            "#f2e961",
            "#f1eb65",
            "#f1ed68",
            "#f1ef6c",
            "#f1f170",
            "#f2f274",
            "#f2f479",
            "#f3f67d",
            "#f4f882",
            "#f5f986",
            "#f6fa8b",
            "#f8fb90"
        ]
    },
    rainbow: {
        colors: ["#96005A", "#0000C8", "#0019FF", "#0098FF", "#2CFF96", "#97FF00", "#FFEA00", "#FF6F00", "#FF0000"],
        positions: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]
    },
    jet: {
        colors: ["#000083", "#003CAA", "#05FFFF", "#FFFF00", "#FA0000", "#800000"],
        positions: [0, 0.125, 0.375, 0.625, 0.875, 1]
    },
    greys: {
        colors: ["#000000", "#ffffff"],
        positions: [0, 1]
    },
    earth: {
        colors: ["#000082", "#00b4b4", "#28d228", "#e6e632", "#784614", "#ffffff"],
        positions: [0, 0.1, 0.2, 0.4, 0.6, 1]
    },
    coolwarm: {
        colors: ["#0000ff", "#ffffff", "#ff0000"],
        positions: [0, 0.5, 1]
    },
    hot: {
        colors: ["#000000", "#e60000", "#ffd200", "#ffffff"],
        positions: [0, 0.3, 0.6, 1]
    },
    cool: {
        colors: ["#00ffff", "#ff00ff"],
        positions: [0, 1]
    }
};

/**
 * Parses a hex, rgb, or named color string into RGBA [0..255] values.
 */
export function parseColor(color: string): [number, number, number, number] {
    const trimmed = color.trim().toLowerCase();

    if (trimmed.startsWith("#")) {
        const hex = trimmed.slice(1);
        if (hex.length === 3) {
            return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16), 255];
        }
        if (hex.length === 6) {
            return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 255];
        }
        if (hex.length === 8) {
            return [
                parseInt(hex.slice(0, 2), 16),
                parseInt(hex.slice(2, 4), 16),
                parseInt(hex.slice(4, 6), 16),
                parseInt(hex.slice(6, 8), 16)
            ];
        }
    }

    if (trimmed.startsWith("rgb")) {
        const parts = trimmed
            .replace(/[rgba()]/g, "")
            .split(",")
            .map((s) => parseFloat(s.trim()));
        return [
            Math.round(parts[0] || 0),
            Math.round(parts[1] || 0),
            Math.round(parts[2] || 0),
            parts.length > 3 ? Math.round((parts[3] ?? 1) * 255) : 255
        ];
    }

    // Default fallback (black)
    return [0, 0, 0, 255];
}

/**
 * Builds a 256-color RGBA Lookup Table (Uint8Array of size 1024) from render options.
 */
export function buildColorLUT(options?: ISingleBandRenderOptions): Uint8Array {
    const lut = new Uint8Array(256 * 4);

    let stops: { pos: number; color: [number, number, number, number] }[] = [];

    if (options?.colors && options.colors.length > 0) {
        if (Array.isArray(options.colors[0])) {
            const arr = options.colors as ColorStop[];
            stops = arr.map(([pos, col]) => ({
                pos: Math.max(0, Math.min(1, pos)),
                color: parseColor(col)
            }));
        } else {
            const colList = options.colors as string[];
            const count = colList.length;
            stops = colList.map((col, idx) => ({
                pos: count > 1 ? idx / (count - 1) : 0,
                color: parseColor(col)
            }));
        }
        stops.sort((a, b) => a.pos - b.pos);
    } else {
        const scaleName = (options?.colorScale || "viridis").toLowerCase();
        const def = COLORSCALES[scaleName] || COLORSCALES.viridis;

        if (def.colors instanceof Uint8Array) {
            // Already a precomputed 256*4 table
            if (def.colors.length === 256 * 4) {
                lut.set(def.colors);
                return lut;
            }
        }

        const colList = def.colors as string[];
        const positions = def.positions || colList.map((_, i) => i / Math.max(1, colList.length - 1));
        stops = colList.map((col, idx) => ({
            pos: positions[idx] ?? idx / (colList.length - 1),
            color: parseColor(col)
        }));
    }

    if (stops.length === 0) {
        stops = [
            { pos: 0, color: [0, 0, 0, 255] },
            { pos: 1, color: [255, 255, 255, 255] }
        ];
    }

    // Interpolate 256 entries
    for (let i = 0; i < 256; i++) {
        const t = i / 255;
        let c0 = stops[0];
        let c1 = stops[stops.length - 1];

        for (let j = 0; j < stops.length - 1; j++) {
            if (t >= stops[j].pos && t <= stops[j + 1].pos) {
                c0 = stops[j];
                c1 = stops[j + 1];
                break;
            }
        }

        const range = c1.pos - c0.pos;
        const localT = range > 0 ? (t - c0.pos) / range : 0;

        const r = Math.round(c0.color[0] + (c1.color[0] - c0.color[0]) * localT);
        const g = Math.round(c0.color[1] + (c1.color[1] - c0.color[1]) * localT);
        const b = Math.round(c0.color[2] + (c1.color[2] - c0.color[2]) * localT);
        const a = Math.round(c0.color[3] + (c1.color[3] - c0.color[3]) * localT);

        const offset = i * 4;
        lut[offset] = r;
        lut[offset + 1] = g;
        lut[offset + 2] = b;
        lut[offset + 3] = a;
    }

    return lut;
}

/**
 * Parses and normalizes a nodata value from various representations (number, null, string "NaN", NaN, etc.).
 */
export function parseNoDataValue(val: any): number | null | undefined {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val === "string") {
        const lower = val.trim().toLowerCase();
        if (lower === "nan" || lower === "-nan" || lower === "+nan") return NaN;
        if (lower === "none" || lower === "null" || lower === "") return null;
        const parsed = Number(val);
        return Number.isNaN(parsed) ? null : parsed;
    }
    if (typeof val === "number") {
        return val;
    }
    return undefined;
}

/**
 * Checks if a raster value represents NoData, taking NaN, null, and float precision into account.
 */
export function isNoData(val: number, nodata: number | null | undefined): boolean {
    if (Number.isNaN(val)) return true;
    if (nodata === null || nodata === undefined || Number.isNaN(nodata)) return false;
    if (val === nodata) return true;
    if (Math.fround(val) === Math.fround(nodata)) return true;
    const absDiff = Math.abs(val - nodata);
    if (absDiff < 1e-6) return true;
    const maxVal = Math.max(Math.abs(val), Math.abs(nodata));
    if (maxVal > 0 && absDiff / maxVal < 1e-5) return true;
    return false;
}

/**
 * Returns a high-performance nodata checking predicate for inner pixel loops.
 */
export function getFastNoDataChecker(nodata: number | null | undefined): (val: number) => boolean {
    if (nodata === null || nodata === undefined || Number.isNaN(nodata)) {
        return (val: number) => Number.isNaN(val);
    }
    const fNodata = Math.fround(nodata);
    return (val: number) => {
        if (val === nodata || Number.isNaN(val)) return true;
        if (Math.fround(val) === fNodata) return true;
        const absDiff = Math.abs(val - nodata);
        if (absDiff < 1e-6) return true;
        const maxVal = Math.max(Math.abs(val), Math.abs(nodata));
        return maxVal > 0 && absDiff / maxVal < 1e-5;
    };
}

/**
 * Calculates min and max from a raster array, ignoring NaN and NoData.
 */
export function getRasterMinMax(
    data: TypedRasterArray,
    nodata: number | null | undefined
): { min: number; max: number } {
    let min = Infinity;
    let max = -Infinity;
    const len = data.length;

    for (let i = 0; i < len; i++) {
        const val = data[i];
        if (isNoData(val, nodata)) {
            continue;
        }
        if (val < min) min = val;
        if (val > max) max = val;
    }

    if (min === Infinity || max === -Infinity) {
        return { min: 0, max: 1 };
    }
    return { min, max };
}

/**
 * Creates an ImageData instance with fallback for non-browser/worker/test environments.
 */
export function createImageData(width: number, height: number): ImageData {
    if (typeof ImageData !== "undefined") {
        return new ImageData(width, height);
    }
    return {
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4),
        colorSpace: "srgb"
    } as unknown as ImageData;
}

/**
 * Renders a single band raster to an ImageData using a color LUT.
 */
export function renderSingleBandToImageData(
    raster: TypedRasterArray,
    width: number,
    height: number,
    options?: ISingleBandRenderOptions,
    nodata: number | null = null,
    outImageData?: ImageData
): ImageData {
    const imgData = outImageData || createImageData(width, height);
    const rgba = imgData.data;
    const lut = buildColorLUT(options);

    let [min, max] = options?.domain || [undefined, undefined];
    if (min === undefined || max === undefined) {
        const minMax = getRasterMinMax(raster, nodata);
        min = min ?? minMax.min;
        max = max ?? minMax.max;
    }

    const diff = max - min || 1e-6;
    const scale = 255 / diff;
    const displayRange = options?.displayRange;
    const clampLow = options?.clampLow ?? true;
    const clampHigh = options?.clampHigh ?? true;
    const pixelCount = width * height;
    const hasNoData = nodata !== null && nodata !== undefined && !Number.isNaN(nodata);
    const checkNoData = hasNoData ? getFastNoDataChecker(nodata) : null;

    for (let i = 0; i < pixelCount; i++) {
        const val = raster[i];
        const outIdx = i * 4;

        if (checkNoData ? checkNoData(val) : Number.isNaN(val)) {
            rgba[outIdx + 3] = 0;
            continue;
        }

        if (displayRange && (val < displayRange[0] || val > displayRange[1])) {
            rgba[outIdx + 3] = 0;
            continue;
        }

        let norm255 = ((val - min) * scale + 0.5) | 0;

        if (clampLow && norm255 < 0) norm255 = 0;
        if (clampHigh && norm255 > 255) norm255 = 255;

        if (norm255 < 0 || norm255 > 255) {
            rgba[outIdx + 3] = 0;
            continue;
        }

        const lutIdx = norm255 * 4;
        rgba[outIdx] = lut[lutIdx];
        rgba[outIdx + 1] = lut[lutIdx + 1];
        rgba[outIdx + 2] = lut[lutIdx + 2];
        rgba[outIdx + 3] = lut[lutIdx + 3];
    }

    return imgData;
}

/**
 * Renders 3 separate band arrays into an RGB ImageData.
 */
export function renderMultiBandToImageData(
    rBand: TypedRasterArray,
    gBand: TypedRasterArray,
    bBand: TypedRasterArray,
    width: number,
    height: number,
    options?: IMultiBandRenderOptions,
    nodata: number | null = null,
    outImageData?: ImageData
): ImageData {
    const imgData = outImageData || createImageData(width, height);
    const rgba = imgData.data;
    const pixelCount = width * height;

    const rMin = options?.r?.min ?? 0;
    const rMax = options?.r?.max ?? 255;
    const rDiff = rMax - rMin || 1;

    const gMin = options?.g?.min ?? 0;
    const gMax = options?.g?.max ?? 255;
    const gDiff = gMax - gMin || 1;

    const bMin = options?.b?.min ?? 0;
    const bMax = options?.b?.max ?? 255;
    const bDiff = bMax - bMin || 1;

    const rScale = 255 / rDiff;
    const gScale = 255 / gDiff;
    const bScale = 255 / bDiff;

    const hasNoData = nodata !== null && nodata !== undefined && !Number.isNaN(nodata);

    if (!hasNoData) {
        for (let i = 0; i < pixelCount; i++) {
            const outIdx = i * 4;

            const rVal = rBand[i];
            const gVal = gBand[i];
            const bVal = bBand[i];

            if (Number.isNaN(rVal) || Number.isNaN(gVal) || Number.isNaN(bVal)) {
                rgba[outIdx + 3] = 0;
                continue;
            }

            let r = ((rVal - rMin) * rScale + 0.5) | 0;
            if (r < 0) r = 0;
            else if (r > 255) r = 255;

            let g = ((gVal - gMin) * gScale + 0.5) | 0;
            if (g < 0) g = 0;
            else if (g > 255) g = 255;

            let b = ((bVal - bMin) * bScale + 0.5) | 0;
            if (b < 0) b = 0;
            else if (b > 255) b = 255;

            rgba[outIdx] = r;
            rgba[outIdx + 1] = g;
            rgba[outIdx + 2] = b;
            rgba[outIdx + 3] = 255;
        }
    } else {
        const checkNoData = getFastNoDataChecker(nodata);
        for (let i = 0; i < pixelCount; i++) {
            const outIdx = i * 4;
            const rVal = rBand[i];
            const gVal = gBand[i];
            const bVal = bBand[i];

            if (checkNoData(rVal) || checkNoData(gVal) || checkNoData(bVal)) {
                rgba[outIdx + 3] = 0;
                continue;
            }

            let r = ((rVal - rMin) * rScale + 0.5) | 0;
            if (r < 0) r = 0;
            else if (r > 255) r = 255;

            let g = ((gVal - gMin) * gScale + 0.5) | 0;
            if (g < 0) g = 0;
            else if (g > 255) g = 255;

            let b = ((bVal - bMin) * bScale + 0.5) | 0;
            if (b < 0) b = 0;
            else if (b > 255) b = 255;

            rgba[outIdx] = r;
            rgba[outIdx + 1] = g;
            rgba[outIdx + 2] = b;
            rgba[outIdx + 3] = 255;
        }
    }

    return imgData;
}

/**
 * Converts raw RGB/RGBA raster array(s) directly to an ImageData.
 */
export function renderRgbRastersToImageData(
    rasters: TypedRasterArray[],
    width: number,
    height: number,
    nodata: number | null = null,
    outImageData?: ImageData
): ImageData {
    const imgData = outImageData || createImageData(width, height);
    const rgba = imgData.data;
    const pixelCount = width * height;
    const isRgba = rasters.length >= 4;

    const rBand = rasters[0];
    const gBand = rasters[1] || rasters[0];
    const bBand = rasters[2] || rasters[0];
    const aBand = isRgba ? rasters[3] : null;

    const hasNoData = nodata !== null && nodata !== undefined && !Number.isNaN(nodata);

    if (!hasNoData) {
        for (let i = 0; i < pixelCount; i++) {
            const outIdx = i * 4;
            const r = rBand[i];
            const g = gBand[i];
            const b = bBand[i];

            if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
                rgba[outIdx + 3] = 0;
                continue;
            }

            rgba[outIdx] = r;
            rgba[outIdx + 1] = g;
            rgba[outIdx + 2] = b;
            rgba[outIdx + 3] = isRgba ? aBand![i] : 255;
        }
    } else {
        const checkNoData = getFastNoDataChecker(nodata);
        for (let i = 0; i < pixelCount; i++) {
            const outIdx = i * 4;
            const r = rBand[i];
            const g = gBand[i];
            const b = bBand[i];
            const a = aBand ? aBand[i] : 255;

            if (checkNoData(r) || checkNoData(g) || checkNoData(b)) {
                rgba[outIdx + 3] = 0;
                continue;
            }

            rgba[outIdx] = r;
            rgba[outIdx + 1] = g;
            rgba[outIdx + 2] = b;
            rgba[outIdx + 3] = a;
        }
    }

    return imgData;
}
