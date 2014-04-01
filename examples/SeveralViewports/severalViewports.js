function start() {

    var skybox = new og.node.SkyBox({
        "positiveX": "http://www.openglobus.org/resources/images/skyboxes/tycho/px.jpg",
        "negativeX": "http://www.openglobus.org/resources/images/skyboxes/tycho/nx.jpg",
        "positiveY": "http://www.openglobus.org/resources/images/skyboxes/tycho/py.jpg",
        "negativeY": "http://www.openglobus.org/resources/images/skyboxes/tycho/ny.jpg",
        "positiveZ": "http://www.openglobus.org/resources/images/skyboxes/tycho/pz.jpg",
        "negativeZ": "http://www.openglobus.org/resources/images/skyboxes/tycho/nz.jpg"
    });

    var satlayer = new og.layer.XYZ("MapQuest Satellite", { isBaseLayer: true, url: "http://otile1.mqcdn.com/tiles/1.0.0/sat/{zoom}/{tilex}/{tiley}.jpg", visibility: true, zIndex: 1 });

    globus = new og.Globus({
        "target": "globus",
        "name": "Earth",
        "controls": [
            new og.control.MouseNavigation({ autoActivate: true })
        ],
        "skybox": skybox,
        "terrain": new og.terrainProvider.TerrainProvider("OpenGlobus", {
            url: og.terrainProvider.TerrainServers.OpenGlobus.url,
            maxZoom: og.terrainProvider.TerrainServers.OpenGlobus.maxZoom,
            minZoom: og.terrainProvider.TerrainServers.OpenGlobus.minZoom
        }),
        "layers": [satlayer],
        "autoActivated": true
    });

    globus2 = new og.Globus({
        "target": "globus2",
        "name": "Earth",
        "controls": [new og.control.MouseNavigation({ autoActivate: true })],
        "terrain": new og.terrainProvider.TerrainProvider("OpenGlobus", {
            url: og.terrainProvider.TerrainServers.OpenGlobus.url,
            maxZoom: og.terrainProvider.TerrainServers.OpenGlobus.maxZoom,
            minZoom: og.terrainProvider.TerrainServers.OpenGlobus.minZoom
        }),
        "layers": [new og.layer.XYZ("OpenStreetMap", { isBaseLayer: true, url: "http://a.tile.openstreetmap.org/{zoom}/{tilex}/{tiley}.png", zIndex: 0, visibility: true })],
        "autoActivated": true
    });
};