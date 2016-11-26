function start() {
    //og.RESOURCES_URL = "./resources/";

    var osm = new og.layer.XYZ("OpenStreetMap", {
        specular: og.math.vector3(0.0003, 0.00012, 0.00001),
        shininess: 20,
        diffuse: og.math.vector3(0.89, 0.9, 0.83),
        extent: og.extent(og.lonLat(-180, -90), og.lonLat(180, 90)),
        isBaseLayer: true,
        url: "http://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        visibility: true,
        attribution: 'Data @ <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="http://www.openstreetmap.org/copyright">ODbL</a>'
    });

    var terrain = new og.terrainProvider.TerrainProvider("OpenGlobus");

    var controls = [
        new og.control.MouseNavigation({ autoActivate: true }),
	    new og.control.TouchNavigation({ autoActivate: true }),
    	new og.control.ZoomControl({ autoActivate: true }),
        new og.control.EarthCoordinates({ autoActivate: true }),
    	new og.control.Sun({ autoActivate: true })
    ];

    globus = new og.Globus({
        "target": "globus",
        "name": "Earth",
        "controls": controls,
        "skybox": og.scene.defaultSkyBox(),
        "terrain": terrain,
        "layers": [osm],
        "autoActivated": true
    });

    globus.planet.viewExtentArr([158.0713, 52.4024, 158.2910, 52.5095]);

    globus.planet.RATIO_LOD = 0.9;
};