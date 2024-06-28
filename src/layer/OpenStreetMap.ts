import {XYZ, IXYZParams} from "./XYZ";

export class OpenStreetMap extends XYZ {
    constructor(name: string | null, options: IXYZParams = {}) {
        super(name || "OpenStreetMap", {
            iconSrc: "https://tile.openstreetmap.org/8/138/95.png",
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution: 'Data @ OpenStreetMap contributors, ODbL',
            isBaseLayer: true,
            maxNativeZoom: 19,
            defaultTextures: [{color: "#AAD3DF"}, {color: "#F2EFE9"}],
            isSRGB: false,
            shininess: 18,
            specular: [0.00063, 0.00055, 0.00032],
            ambient: [0.2, 0.2, 0.3],
            diffuse: [0.9, 0.9, 0.7],
            ...options
        });
    }
}