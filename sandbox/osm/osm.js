import { Globe } from "../../src/og/Globe.js";
import { Entity } from "../../src/og/entity/Entity.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
import { CanvasTiles } from "../../src/og/layer/CanvasTiles.js";
import { Vector } from "../../src/og/layer/Vector.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";
import { EmptyTerrain } from "../../src/og/terrain/EmptyTerrain.js";
import { labelXYZ } from "./labelXYZ.js";

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

        //Draw border
        ctx.beginPath();
        ctx.rect(0, 0, cnv.width, cnv.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "black";
        ctx.stroke();

        let size;

        if (material.segment.isPole) {
            let ext = material.segment.getExtentLonLat();

            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, 256, 256);
            //ctx.font = 'normal ' + 29 + 'px Verdana';
            //ctx.textAlign = 'center';
            //ctx.fillText(`${ext.northEast.lon.toFixed(3)} ${ext.northEast.lat.toFixed(3)}`, cnv.width / 2, cnv.height / 2 + 20);
            //ctx.fillText(`${ext.southWest.lon.toFixed(3)} ${ext.southWest.lat.toFixed(3)}`, cnv.width / 2, cnv.height / 2 - 20);
        } else {
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

        //Draw canvas tile
        applyCanvas(cnv);
    }
});

const labelLayer = new labelXYZ("labelLayer", {
    isBaseLayer: false,
    visibility: true,
    // zIndex: GlobeConst.labelZIndex,
    url: "//t.ssl.ak.dynamic.tiles.virtualearth.net/comp/ch/{key}?mkt=en-us&it=Z%2CGF%2CL&shading=hill&og=1471&n=z&ur=JP&js=1&cstl=in&st=me|lv:0_pp|lv:1_cr|lv:1_ad|lv:1&nvlos=1&vpt=e,p&pll=1&ell=1",
    countryLayerData: "//assets.msn.com/weathermapdata/1/static/3d/label.0.1/country-{}.json",
    height: 16,
    size: 11.5,
    color: "white"
});

var osm = new XYZ("OpenStreetMap", {
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
    attribution: "Data @ OpenStreetMap contributors, ODbL"
});

var globus = new Globe({
    target: "earth",
    name: "Earth",
    maxAltitude: 15000000,
    minAltitude: 4200000,
    terrain: new EmptyTerrain({
        gridSizeByZoom: [32, 32, 32, 32, 16, 8, 8]
    }),
    layers: [labelLayer, tg],
    useNightTexture: false,
    useSpecularTexture: false
});

window.globus = globus;
