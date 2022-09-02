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

var globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new EmptyTerrain(),
    layers: [],
    useNightTexture: false,
    useSpecularTexture: false
});

function getYearsLayers(yearsArr) {
    let res = [];
    for (let i = 0; i < yearsArr.length; i++) {
        let y = yearsArr[i].toString();
        let img = new GeoImage(`${y} million years}`, {
            src: `./scotese/${y}.jpg`,
            corners: [[-180, 90], [180, 90], [180, -90], [-180, -90]],
            isBaseLayer: false,
            attribution: '',
            fullExtent: true
        });
        res.push(img);
    }
    return res;
}

let yearsAgo = [0, 20, 35, 50, 66, 90, 105, 120, 150, 170, 200, 220, 240, 260, 280, 300, 340, 370, 400, 430, 450, 470, 500, 540, 600, 750];
let timeLayers = getYearsLayers(yearsAgo);

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
    la.setCurrentIndex(index, true, true);
});

la.events.on("change", (currIndex) => {
    $slider.value = Math.round(currIndex * 100 / la.layers.length);
});

globus.sun.deactivate();

window.la = la;

window.globus = globus;
