goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.node.Planet');
goog.require('og.layer.XYZ');
goog.require('og.terrainProvider.TerrainProvider');
goog.require('og.control.MouseNavigation');
goog.require('og.control.KeyboardNavigation');
goog.require('og.control.LayerSwitcher');
goog.require('og.control.LoadingSpinner');
goog.require('og.ellipsoid.wgs84');
goog.require('og.shaderProgram.planetShader');

function start() {

    var context = new og.webgl.Handler("canvas");
    context.addShaderProgram(og.shaderProgram.planetShader);
    context.init();

    var renderer = new og.Renderer(context);
    renderer.init();

    var osm = new og.layer.XYZ("OpenStreetMap", { isBaseLayer: true, url: "http://a.tile.openstreetmap.org/{zoom}/{tilex}/{tiley}.png" });
    var sat = new og.layer.XYZ("MapQuest Satellite", { isBaseLayer: true, url: "http://otile1.mqcdn.com/tiles/1.0.0/sat/{zoom}/{tilex}/{tiley}.jpg", visibility: true });
    var arcgis = new og.layer.XYZ("ArcGIS World Imagery", { isBaseLayer: true, url: "http://127.0.0.1/ArcGIS/rest/services/World_Imagery/MapServer/tile/{zoom}/{tiley}/{tilex}" });
    var quest = new og.layer.XYZ("MapQuest", { isBaseLayer: true, url: "http://otile1.mqcdn.com/tiles/1.0.0/map/{zoom}/{tilex}/{tiley}.jpg" });
    var kosmosnim = new og.layer.XYZ("Kosmosnimki", { isBaseLayer: true, url: "http://maps.kosmosnimki.ru/TileService.ashx?Request=gettile&apikey=L5VW1QBBHJ&layerName=4F9F7CCCCBBC4BD08469F58C02F17AE4&crs=epsg:3857&z={zoom}&x={tilex}&y={tiley}" });

    var terrain = new og.terrainProvider.TerrainProvider("OpenGlobus", {
        url: og.terrainProvider.TerrainServers.OpenGlobus.url,
        maxZoom: og.terrainProvider.TerrainServers.OpenGlobus.maxZoom,
        minZoom: og.terrainProvider.TerrainServers.OpenGlobus.minZoom
    });

    var planet = new og.node.Planet("Earth", og.ellipsoid.wgs84);
    planet.addLayers([osm, sat, quest, arcgis, kosmosnim]);
    planet.setBaseLayer(sat);
    planet.setTerrainProvider(terrain);

    renderer.addRenderNode(planet);

    renderer.addControls([
        new og.control.MouseNavigation({ autoActivate: true }),
        new og.control.KeyboardNavigation({ autoActivate: true }),
        new og.control.LoadingSpinner({ autoActivate: true }),
        new og.control.LayerSwitcher({ autoActivate: true })
    ]);

    renderer.Start();
};
