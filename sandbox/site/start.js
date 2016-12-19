function start() {
    //og.RESOURCES_URL = "./resources/";

    var osm = new og.layer.XYZ("OpenStreetMap", {
        specular: [0.0003, 0.00012, 0.00001],
        extent: [[0, 0], [45, 45]],
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
                text: "Hi there!",
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
};