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


let osm1 = new XYZ("osm-1", {
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxNativeZoom: 19,
    defaultTextures: [{ color: "#AAD3DF" }, { color: "#F2EFE9" }],
    isSRGB: false,
    visibility: true,
    //zIndex: 0,
    opacity: 1.0
});

var globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusTerrain(),
    layers: [osm1],
});

function createCanvasTilesLayer(id) {
    return new CanvasTiles(`cnv-${id}`, {
        visibility: true,
        isBaseLayer: true,
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
            ctx.strokeStyle = 'black';
            ctx.stroke();

            ctx.fillStyle = 'black';
            ctx.font = 'normal ' + 29 + 'px Verdana';

            ctx.textAlign = 'center';
            ctx.fillText(id.toString(), cnv.width / 2, cnv.height / 2);

            if (this.name === "cnv-5"/* || this.name === "cnv-6" || this.name === "cnv-7"*/) {
                setTimeout(() => {
                    applyCanvas(cnv);
                }, 10000)
            } else {
                //Draw canvas tile
                setTimeout(() => {
                    applyCanvas(cnv);
                }, 800);
            }
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

let timeLayers = getCanvasLayers(50);

let la = new LayerAnimation({
    layers: timeLayers,
    repeat: true
});

globus.planet.addControl(new LayerSwitcher());
globus.planet.addControl(la);

let $slider = document.querySelector(".pl-slider"),
    $play = document.querySelector(".pl-button__play");

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
