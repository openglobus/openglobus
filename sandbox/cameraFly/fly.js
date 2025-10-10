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
    layers: [new Bing()],
    atmosphereEnabled: false,
    fontsSrc: "../../res/fonts"
});

let i = 0;
let positions = [
    [new LonLat(18.13534485885474, 68.67810407890877, 302.3275792848293), new LonLat(18.13534485885474, 68.6781489039229, 226.178891625212)],
    [new LonLat(18.13729287744565, 68.678802266203, 296.18474249449235), new LonLat(18.13729287744565, 68.6788470912134, 216.63051217048513)],
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
