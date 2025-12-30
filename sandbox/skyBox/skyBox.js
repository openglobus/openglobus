import {
    Globe,
    LonLat,
    OpenStreetMap,
    scene,
    control,
    GlobusRgbTerrain
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
    terrain: new GlobusRgbTerrain(),
    layers: [new OpenStreetMap()],
    atmosphereEnabled: true,
    skybox: skybox,
    controls: [
        new control.MouseNavigation({ mode: "lockNorth" }),
        new control.KeyboardNavigation({ autoActivate: true }),
        new control.ToggleWireframe(),
        new control.TimelineControl(),
        new control.CompassButton()
    ]
})