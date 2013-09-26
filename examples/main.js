goog.provide('og.start');

goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.node.Planet');
goog.require('og.layer');
goog.require('og.layer.XYZ');
goog.require('og.layer.WMS');
goog.require('og.terrainProvider.TerrainProvider');
goog.require('og.control.MouseNavigation');
goog.require('og.control.KeyboardNavigation');
goog.require('og.control.LayerSwitcher');
goog.require('og.control.ToggleWireframe');
goog.require('og.control.ShowFps');
goog.require('og.control.MousePosition');
goog.require('og.ellipsoid.wgs84');
goog.require('og.node.SkyBox');


og.start = function() {
    context = new og.webgl.Handler("canvas");
    context.init();

    renderer = new og.Renderer(context);
    renderer.init();

    var planet = new og.node.Planet("Earth", og.ellipsoid.wgs84);

    var layer = new og.layer.XYZ("OpenStreetMap", { isBaseLayer: true, url: og.layer.MapServersProxy.OSMb.url });
    var satlayer = new og.layer.XYZ("MapQuest Satellite", { isBaseLayer: true, url: og.layer.MapServersProxy.MapQuestSat.url, visibility: true });
    var mqosm = new og.layer.XYZ("MapQuest", { isBaseLayer: true, url: og.layer.MapServersProxy.MapQuest.url });
    var kosmosnim = new og.layer.XYZ("Kosmosnimki", { isBaseLayer: true, url: og.layer.MapServersProxy.Cosmosnimki.url });
    var kray5m = new og.layer.WMS("geoserver:Kray5m", { isBaseLayer: true, url: "http://127.0.0.1/geoserver/gwc/service/", layers: "lem3d:kray5m" });

    var terrain = new og.terrainProvider.TerrainProvider("OpenGlobus", {
        url: og.terrainProvider.TerrainServers.OpenGlobus.url,
        maxZoom: og.terrainProvider.TerrainServers.OpenGlobus.maxZoom,
        minZoom: og.terrainProvider.TerrainServers.OpenGlobus.minZoom
    });

    planet.addLayers([layer, satlayer, mqosm, kosmosnim, kray5m]);
    planet.setBaseLayer(satlayer);
    planet.setTerrainProvider(terrain);

    var skybox = new og.node.SkyBox();

    renderer.addRenderNode(planet);
    renderer.addRenderNode(skybox);
    renderer.addControls([
        new og.control.MouseNavigation({ autoActivate: true }),
        new og.control.KeyboardNavigation({ autoActivate: true }),
        new og.control.ToggleWireframe({ autoActivate: true }),
        new og.control.ShowFps({ autoActivate: true }),
        new og.control.MousePosition({ autoActivate: true }),
	new og.control.LayerSwitcher({ autoActivate: true })
    ]);

    renderer.Start();
};

goog.exportSymbol('og.start', og.start);
