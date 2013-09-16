function main() {
    context = new og.webglContext.WebGLContext("canvas");
    context.Init();

    renderer = new og.Renderer(context);
    renderer.init();

    var ellipsoid = new og.ellipsoid.Ellipsoid();
    var planet = new og.node.planet.Planet(ellipsoid);

    var layer = new og.layer.XYZ("Openstreetmap", { isBaseLayer: true, url: og.layer.MapServersProxy.OSMb.url });
    var satlayer = new og.layer.XYZ("MapQuest", { isBaseLayer: true, url: og.layer.MapServersProxy.MapQuestSat.url });
    var kosmosnim = new og.layer.XYZ("MapQuest", { isBaseLayer: true, url: og.layer.MapServersProxy.Cosmosnimki.url });
    var kray5m = new og.layer.WMS("Белг.Край 5м.", { isBaseLayer: true, url: "http://127.0.0.1/geoserver/gwc/service/", layers: "lem3d:kray5m" });

    var terrain = new og.terrainProvider.TerrainProvider("OpenGlobus", {
        url: og.terrainProvider.TerrainServers.OpenGlobus.url,
        maxZoom: og.terrainProvider.TerrainServers.OpenGlobus.maxZoom,
        minZoom: og.terrainProvider.TerrainServers.OpenGlobus.minZoom
    });

    planet.addLayers([layer, satlayer, kosmosnim, kray5m]);
    planet.setBaseLayer(satlayer);
    planet.setTerrainProvider(terrain);

//    var skybox = new SkyBox();

    //render.addRenderNode(new StripNode(10));
    renderer.addRenderNode(planet);
//    renderer.addRenderNode(skybox);
    renderer.addControls([new og.control.MouseNavigation({ autoActivate: true }), new og.control.KeyboardNavigation({ autoActivate: true })]);
    //render.activeCamera.setPlanetEllipsoid(ellipsoid);
    //render.activeCamera.setLatLonToPosition();
    //render.activeCamera.movespeed = 0.1;
    //render.activeCamera.position.z = 20;
    renderer.Start();
}
