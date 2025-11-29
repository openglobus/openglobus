import {
    Globe,
    LonLat,
    OpenStreetMap,
    scene,
    control
} from "../../lib/og.es.js";

const skybox = new scene.SkyBox({
    px: "./px.webp",
    nx: "./nx.webp",
    py: "./py.webp",
    ny: "./ny.webp",
    pz: "./pz.webp",
    nz: "./nz.webp"
});

const globus = new Globe({
    target: "earth",
    name: "Earth",
    layers: [new OpenStreetMap()],
    atmosphereEnabled: true,
    skybox: skybox,
    controls: [
        new control.MouseNavigation({ minSlope: 0.35 }),
        new control.KeyboardNavigation({ autoActivate: true })
    ]
})