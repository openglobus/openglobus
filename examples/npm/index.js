import { Globe, Entity } from '@openglobus/og';
import { GlobusTerrain } from '@openglobus/og/terrain';
import { XYZ, Vector } from '@openglobus/og/layer';

var osm = new XYZ("OpenStreetMap", {
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
    attribution: "Data @ OpenStreetMap contributors, ODbL"
});

var globus = new Globe({
    target: "globus",
    name: "Earth",
    terrain: new GlobusTerrain(),
    layers: [osm],
    autoActivated: true
});

new Vector("Markers", {
    clampToGround: true
})
    .addTo(globus.planet)
    .add(
        new Entity({
            lonlat: [5.73, 45.183],
            label: {
                text: "Hi, Globus!",
                outline: 0.77,
                outlineColor: "rgba(255,255,255,.4)",
                size: 27,
                color: "black",
                face: "Lucida Console",
                offset: [10, -2]
            },
            billboard: {
                src: "./marker.png",
                width: 64,
                height: 64,
                offset: [0, 32]
            }
        })
    );

globus.planet.viewExtentArr([5.54, 45.141, 5.93, 45.23]);