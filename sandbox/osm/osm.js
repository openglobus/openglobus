import { Globe } from "../../src/og/Globe.js";
import { Entity } from "../../src/og/entity/Entity.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
import { CanvasTiles } from "../../src/og/layer/CanvasTiles.js";
import { Vector } from "../../src/og/layer/Vector.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";
import { EmptyTerrain } from "../../src/og/terrain/EmptyTerrain.js";
//import { labelXYZ } from "./labelXYZ.js";
//import { labelXYZ } from "./labelXYZ_new.js";
import { stringTemplate } from "../../src/og/utils/shared.js";
import { Lighting } from "../../src/og/control/Lighting.js";

const tg = new CanvasTiles("Tile grid", {
    visibility: true,
    isBaseLayer: false,
    drawTile: function (material, applyCanvas) {
        //
        // This is important create canvas here!
        //
        let cnv = document.createElement("canvas");
        let ctx = cnv.getContext("2d");
        cnv.width = 256;
        cnv.height = 256;

        //Clear canvas
        ctx.clearRect(0, 0, cnv.width, cnv.height);

        let size;

        if (material.segment.isPole) {
            let ext = material.segment.getExtentLonLat();

            ctx.fillStyle = "rgb(81, 127, 86)";
            ctx.fillRect(0, 0, 256, 256);
            //ctx.font = 'normal ' + 29 + 'px Verdana';
            //ctx.textAlign = 'center';
            //ctx.fillText(`${ext.northEast.lon.toFixed(3)} ${ext.northEast.lat.toFixed(3)}`, cnv.width / 2, cnv.height / 2 + 20);
            //ctx.fillText(`${ext.southWest.lon.toFixed(3)} ${ext.southWest.lat.toFixed(3)}`, cnv.width / 2, cnv.height / 2 - 20);
        } else {

            ctx.fillStyle = "rgb(81, 127, 86)";
            ctx.fillRect(0, 0, 256, 256);
            //Draw text
            //    if (material.segment.tileZoom > 14) {
            //        size = "26";
            //    } else {
            //        size = "32";
            //    }
            //    ctx.fillStyle = 'black';
            //    ctx.font = 'normal ' + size + 'px Verdana';
            //    ctx.textAlign = 'center';
            //    ctx.fillText(material.segment.tileX + "," + material.segment.tileY + "," + material.segment.tileZoom, cnv.width / 2, cnv.height / 2);
        }

        //Draw border
        ctx.beginPath();
        ctx.rect(0, 0, cnv.width, cnv.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "black";
        ctx.stroke();

        //Draw canvas tile
        applyCanvas(cnv);
    }
});

function toQuadKey(x, y, z) {
    var index = '';
    for (var i = z; i > 0; i--) {
        var b = 0;
        var mask = 1 << (i - 1);
        if ((x & mask) !== 0) b++;
        if ((y & mask) !== 0) b += 2;
        index += b.toString();
    }
    return index;
};

var borders = new XYZ("OpenStreetMap", {
    isBaseLayer: false,
    textureFilter:"mipmap",
    url: "//t.ssl.ak.dynamic.tiles.virtualearth.net/comp/ch/{quad}?mkt=en-us&it=Z,GF,L&shading=t&og=1638&n=z&ur=US&o=PNG&st=me|lv:0;v:0_wt|v:1_trs|v:1;lv:0;sc:FF6B6B6B;fc:FF6B6B6B;strokeWidthScale:0.2_cst|v:1;fc:FF000000;strokeWidthScale:0.5&cstl=weather&shdw=1&rs=1&dpi=d1",
    visibility: true,
    attribution: "Data @ OpenStreetMap contributors, ODbL",
    urlRewrite: function (s, u) {
        return stringTemplate(u, {
            'quad': toQuadKey(s.tileX, s.tileY, s.tileZoom)
        });
    }
});

var globus = new Globe({
    target: "earth",
    name: "Earth",
    maxAltitude: 15000000,
    minAltitude: 1,
    terrain: new EmptyTerrain({
        gridSizeByZoom: [32, 32, 32, 32, 16, 8, 8, 8, 8, 8, 8, 8, 8, 8]
    }),
    maxEqualZoomAltitude: 15000000,
    layers: [tg, borders],
    useNightTexture: false,
    useSpecularTexture: false
});

globus.planet.addControl(new Lighting());

window.globus = globus;
