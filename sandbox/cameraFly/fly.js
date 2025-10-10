/* eslint-disable no-undef */
import {
    Globe,
    LonLat,
    OpenStreetMap,
    GlobusRgbTerrain,
    Bing,
    Easing
} from "../../lib/og.es.js";

const globus = new Globe({
    target: "earth",
    name: "Earth",
    terrain: new GlobusRgbTerrain(),
    layers: [new OpenStreetMap(), new Bing()],
    atmosphereEnabled: false,
    fontsSrc: "../../res/fonts"
});

let i = 0;
let positions = [
    [new LonLat(10.13176, 46.18868, 10779), new LonLat(9.98464, 46.06157, 3039)],
    [new LonLat(11, 45, 10779), new LonLat(10, 44.9, 0)],
];

const performFlight = (ease) => {
    let ell = globus.planet.ellipsoid;
    i++;
    let destPos = positions[i % positions.length][0];
    let viewPoi = positions[i % positions.length][1];

    let lookCart = ell.lonLatToCartesian(viewPoi);
    let upVec = ell.lonLatToCartesian(destPos).normalize();

    globus.planet.camera.flyLonLat(destPos, {
        look: lookCart,
        up: upVec,
        amplitude: 0,
        ease
    });
}
const buttons = document.getElementsByTagName("button");
for (let bi = 0; bi < buttons.length; bi++) {
    const btn = buttons[bi];
    btn.addEventListener("click", () => {
        performFlight(Easing[btn.id]);
    });
}

globus.planet.renderer.controls.SimpleSkyBackground.colorOne = "black";
globus.planet.renderer.controls.SimpleSkyBackground.colorTwo = "black";
