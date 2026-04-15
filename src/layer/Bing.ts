import { XYZ } from "./XYZ";
import type { IXYZParams } from "./XYZ";
import { Segment } from "../segment/Segment";
import { stringTemplate } from "../utils/shared";

function toQuadKey(x: number, y: number, z: number) {
    var index = "";
    for (let i = z; i > 0; i--) {
        var b = 0;
        var mask = 1 << (i - 1);
        if ((x & mask) !== 0) b++;
        if ((y & mask) !== 0) b += 2;
        index += b.toString();
    }
    return index;
}

export class Bing extends XYZ {
    constructor(name: string | null, options: IXYZParams = {}) {
        super(name || "Bing", {
            iconSrc: "https://ecn.t0.tiles.virtualearth.net/tiles/a120.jpeg?n=z&g=7146",
            subdomains: ["t0", "t1", "t2", "t3"],
            url: "https://ecn.{s}.tiles.virtualearth.net/tiles/a{quad}.jpeg?n=z&g=7146",
            isBaseLayer: true,
            textureFilter: "LINEAR",
            maxNativeZoom: 17,
            defaultTextures: [{ color: "#001522" }, { color: "#E4E6F3" }],
            attribution: `<div style="transform: scale(0.8); margin-top:-2px;"><a href="https://www.bing.com" target="_blank"><img style="position: relative; top: 2px;" title="Bing Imagery" src="https://sandcastle.cesium.com/CesiumUnminified/Assets/Images/bing_maps_credit.png"></a> © 2021 Microsoft Corporation</div>`,
            urlRewrite: (s: Segment, u: string) => {
                return stringTemplate(u, {
                    s: this._getSubdomain(),
                    quad: toQuadKey(s.tileX, s.tileY, s.tileZoom)
                });
            },
            ambient: [0.15, 0.15, 0.25],
            diffuse: [1.25, 1.25, 1.15],
            shininess: 30,
            specular: [0.05, 0.05, 0.02],
            nightTextureCoefficient: 1,
            ...options
        });
    }
}
