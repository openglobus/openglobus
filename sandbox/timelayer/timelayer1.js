import { Globe } from "../../src/og/Globe.js";
import { XYZ } from "../../src/og/layer/XYZ.js";
import { CanvasTiles } from "../../src/og/layer/CanvasTiles.js";
import { Vector } from "../../src/og/layer/Vector.js";
import { GlobusTerrain } from "../../src/og/terrain/GlobusTerrain.js";
import { EmptyTerrain } from "../../src/og/terrain/EmptyTerrain.js";
import { LayerSwitcher } from "../../src/og/control/LayerSwitcher.js";
import { DebugInfo } from "../../src/og/control/DebugInfo.js";
import { LayerAnimation } from "../../src/og/control/LayerAnimation.js";
import { GeoImage } from '../../src/og/layer/GeoImage.js';
import { RENDERING } from "../../src/og/quadTree/quadTree.js";


let sat = new XYZ("MapBox Satellite", {
    isBaseLayer: true,
    url: "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoibWdldmxpY2hzY2FuZXgiLCJhIjoiY2pwcGdsaXlnMDQzdDQybXhsOWZlbXBvdSJ9.fR2YE-ehJA4iajaJBAPKvw",
    visibility: true,
    attribution: `Mapbox Sattelite`
});


let osm1 = new XYZ("osm-1", {
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxNativeZoom: 19,
    defaultTextures: [{ color: "#AAD3DF" }, { color: "#F2EFE9" }],
    isSRGB: false,
    visibility: true, //zIndex: 0,
    opacity: 1.0
});

var globus = new Globe({
    target: "earth", name: "Earth", terrain: new EmptyTerrain(), layers: [sat],
});

//
// This is important create canvas here!
//
let cnv = document.createElement("canvas");
let ctx = cnv.getContext("2d");
cnv.width = 256;
cnv.height = 256;

function createCanvasTilesLayer(id) {
    return new CanvasTiles(`cnv-${id}`, {
        visibility: true, isBaseLayer: false, textureFilter: "linear", drawTile: function (material, applyCanvas) {

            if (!material.segment.isPole) {
                // let img = new Image();
                // img.onload = () => {
                //     applyCanvas(img);
                // }
                // img.crossOrigin = "";
                let x = material.segment.tileX, y = material.segment.tileY, z = material.segment.tileZoom;
                let time = 202209190800;
                // img.src = `//assets.msn.com/weathermapdata/1/cloudforeca/202209190800/${x}_${y}_${z}_${time}.png`;

                fetch(`//assets.msn.com/weathermapdata/1/cloudforeca/202209190800/${x}_${y}_${z}_${time}.png`)
                    .then(r => r.blob())
                    .then((r) => {
                        let b = createImageBitmap(r, {
                            premultiplyAlpha: "none"
                        });
                        return b;
                    }).then((bitmap) => {

                    let cnv = document.createElement("canvas");
                    let ctx = cnv.getContext("2d");
                    cnv.width = 256;
                    cnv.height = 256;
                    ctx.drawImage(bitmap, 0, 0, cnv.width, cnv.height);
                    var data = ctx.getImageData(0, 0, cnv.width, cnv.height);

                    // for (var i = 0; i < data.data.length; i += 4) {
                    //     let a = data.data[i + 3];
                    //     data.data[i] = data.data[i] / a;
                    //     data.data[i + 1] = data.data[i + 1] / a;
                    //     data.data[i + 2] = data.data[i + 2] / a;
                    // }

                    ctx.putImageData(data, 0, 0);

                    ctx.drawImage(cnv, 0, 0, cnv.width, cnv.height);

                    createImageBitmap(cnv, { premultiplyAlpha: "premultiply" }).then((bm) => {
                        applyCanvas(bm);
                    });
                });

            } else {
                //Clear canvas
                ctx.clearRect(0, 0, cnv.width, cnv.height);

                //Draw border
                ctx.beginPath();
                ctx.rect(0, 0, cnv.width, cnv.height);
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'black';
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.font = 'normal ' + 29 + 'px Verdana';

                ctx.textAlign = 'center';
                ctx.fillText(id.toString(), cnv.width / 2, cnv.height / 2);

                applyCanvas(cnv);

            }

            // if (Number(this.name.split("-")[1]) % 2 === 0) {
            //     setTimeout(() => {
            //
            //         //Clear canvas
            //         ctx.clearRect(0, 0, cnv.width, cnv.height);
            //
            //         //Draw border
            //         ctx.beginPath();
            //         ctx.rect(0, 0, cnv.width, cnv.height);
            //         ctx.lineWidth = 2;
            //         ctx.strokeStyle = 'black';
            //         ctx.stroke();
            //
            //         ctx.fillStyle = 'black';
            //         ctx.font = 'normal ' + 29 + 'px Verdana';
            //
            //         ctx.textAlign = 'center';
            //         ctx.fillText(id.toString(), cnv.width / 2, cnv.height / 2);
            //
            //         applyCanvas(cnv);
            //     }, 200);
            // } else {
            //     //Draw canvas tile
            //     //setTimeout(() => {
            //
            //     //Clear canvas
            //     ctx.clearRect(0, 0, cnv.width, cnv.height);
            //
            //     //Draw border
            //     ctx.beginPath();
            //     ctx.rect(0, 0, cnv.width, cnv.height);
            //     ctx.lineWidth = 2;
            //     ctx.strokeStyle = 'black';
            //     ctx.stroke();
            //
            //     ctx.fillStyle = 'black';
            //     ctx.font = 'normal ' + 29 + 'px Verdana';
            //
            //     ctx.textAlign = 'center';
            //     ctx.fillText(id.toString(), cnv.width / 2, cnv.height / 2);
            //
            //     applyCanvas(cnv);
            //     //}, 800);
            // }
        }
    });
}

function getCanvasLayers(num) {
    let res = [];
    for (let i = 0; i < num; i++) {
        res.push(createCanvasTilesLayer(i));
    }
    return res;
}

function getCloudLayers(num) {
    let res = [];
    for (let i = 0; i < num; i++) {
        let time = 202209190800 + 100 * i;
        let l = new XYZ("cloud-1", {
            textureFilter: "linear",
            isBaseLayer: true,
            url: `//assets.msn.com/weathermapdata/1/cloudforeca/202209190800/{x}_{y}_{z}_${time}.png`,
            maxNativeZoom: 5,
        });
        res.push(l);
    }
    return res;
}

let timeLayers = getCanvasLayers(14);
//let timeLayers = getCloudLayers(14);

let la = new LayerAnimation({
    layers: timeLayers, repeat: true, playInterval: 100
});

let dbi = new DebugInfo();
globus.planet.addControl(dbi);
//globus.planet.addControl(new LayerSwitcher());
globus.planet.addControl(la);

let $slider = document.querySelector(".pl-slider"), $play = document.querySelector(".pl-button__play");

$play.addEventListener("click", (e) => {
    if (e.target.innerText === "PLAY") {
        e.target.innerText = "PAUSE";
        la.play();
    } else {
        e.target.innerText = "PLAY";
        la.pause();
    }
});

document.querySelector(".pl-button__stop").addEventListener("click", () => {
    document.querySelector(".pl-button__play").innerText = "PLAY";
    la.stop();
});

$slider.addEventListener("input", (e) => {
    $play.innerText = "PLAY";
    let val = Number(e.target.value);
    let index = Math.round(val * la.layers.length / 100);
    la.pause();
    la.setCurrentIndex(index, true);
});

la.events.on("change", (currIndex) => {
    $slider.value = Math.round(currIndex * 100 / la.layers.length);
});

window.la = la;

window.globus = globus;
