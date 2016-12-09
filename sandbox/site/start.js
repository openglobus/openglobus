
function solution(N) {
    var gLen = 0;
    var r0 = false,
        r1 = false;
    var sumCurr = 0,
        sumMax = 0;
    for (var i = 0; i < 32; i++) {
        var br = (N >> i & 0x1);
        var bl = (N >> (31 - i) & 0x1);

        if (r0) {
            if (br === 0) {
                sumCurr++;
            } else {
                //br === 1
                if (sumCurr > sumMax) {
                    sumMax = sumCurr;
                }
                sumCurr = 0;
            }

        } else {
            if (br === 1) {
                r0 = true;
            }
        }

    }

    if ((N >> (31 - i) & 0x1) === 1) {
        if (sumCurr > sumMax) {
            sumMax = sumCurr;
        }
    }

    return sumMax;
}

function start() {
    //og.RESOURCES_URL = "./resources/";

    var osm = new og.layer.XYZ("OpenStreetMap", {
        specular: [0.0003, 0.00012, 0.00001],
        shininess: 20,
        diffuse: [0.89, 0.9, 0.83],
        isBaseLayer: true,
        url: "http://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        visibility: true,
        attribution: 'Data @ <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="http://www.openstreetmap.org/copyright">ODbL</a>'
    });

    var controls = [
        og.control.mouseNavigation(),
	    og.control.touchNavigation(),
    	og.control.zoomControl(),
        og.control.earthCoordinates(),
    	og.control.sun()
    ];

    globus = new og.Globus({
        "target": "globus",
        "name": "Earth",
        "controls": controls,
        "skybox": og.scene.defaultSkyBox(),
        "terrain": new og.terrainProvider.TerrainProvider("OpenGlobus"),
        "layers": [osm],
        "autoActivated": true
    });

    og.layer.vector("Markers", { groundAlign: true })
        .addTo(globus.planet)
        .add(new og.Entity({
            lonlat: [158.186, 52.452],
            label: {
                text: "There was Vasya!",
                outline: 0,
                size: 18,
                color: "#000",
                face: "Arial",
                offset: [10, -2]
            },
            billboard: {
                src: "./marker.png",
                width: 64,
                height: 64,
                offset: [0, 32]
            }
        }));

    globus.planet.viewExtentArr([158.0713, 52.4024, 158.2910, 52.5095]);

    globus.planet.RATIO_LOD = 0.9;

    console.log("3 101: " + solution(3));
    console.log("1041 ‭5‬: " + solution(1041));
    console.log("529 ‭4‬: " + solution(529));
    console.log("9 ‭2‬: " + solution(9));
    console.log("0 0: " + solution(0));
    console.log("1 1: " + solution(1));
    console.log("2 10: " + solution(2));
    console.log("1984 0: " + solution(1984));
};