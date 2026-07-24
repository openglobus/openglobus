import { XYZ } from "./XYZ";
import type { IXYZParams } from "./XYZ";

export class OpenStreetMap extends XYZ {
    constructor(name: string | null, options: IXYZParams = {}) {
        super(name || "OpenStreetMap", {
            iconSrc: "https://tile.openstreetmap.org/8/138/95.png",
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution: "Data @ OpenStreetMap contributors, ODbL",
            isBaseLayer: true,
            maxNativeZoom: 19,
            defaultTextures: [{ color: "#AAD3DF" }, { color: "#F2EFE9" }],
            shininess: 30,
            specular: [0.3, 0.3, 0.27],
            ambient: [0.1, 0.1, 0.2],
            diffuse: [0.9, 0.9, 0.9],
            ...options
        });
    }
}
