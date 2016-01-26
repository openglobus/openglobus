function start() {
    og.shaderProgram.SHADERS_URL = "./shaders/";
    og.webgl.MAX_FRAME_DELAY = 28;

    var osm = new og.layer.XYZ("OpenStreetMap", { isBaseLayer: true, url: "http://a.tile.openstreetmap.org/{zoom}/{tilex}/{tiley}.png", visibility: true, attribution: 'Data © <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="http://www.openstreetmap.org/copyright">ODbL</a>' });
    var sat = new og.layer.XYZ("MapQuest Satellite", { isBaseLayer: true, url: "http://otile1.mqcdn.com/tiles/1.0.0/sat/{zoom}/{tilex}/{tiley}.jpg", visibility: false, attribution: '©2014 MapQuest - Portions ©2014 "Map data © <a target="_blank" href="http://www.openstreetmap.org/">OpenStreetMap</a> and contributors, <a target="_blank" href="http://opendatacommons.org/licenses/odbl/"> CC-BY-SA</a>"' });
    var hyb = new og.layer.XYZ("MapQuest Hybrid", { isBaseLayer: false, url: "http://otile1-s.mqcdn.com/tiles/1.0.0/hyb/{zoom}/{tilex}/{tiley}.png", visibility: false, zIndex: 20, opacity: 1, attribution: '' });
    var arcgis = new og.layer.XYZ("ArcGIS World Imagery", { isBaseLayer: true, url: "http://openglobus.org/arcgis/rest/services/World_Imagery/MapServer/tile/{zoom}/{tiley}/{tilex}" });
    var quest = new og.layer.XYZ("MapQuest", { isBaseLayer: true, url: "http://otile1.mqcdn.com/tiles/1.0.0/map/{zoom}/{tilex}/{tiley}.jpg" });
    var kosmosnim = new og.layer.XYZ("Kosmosnimki", { isBaseLayer: true, url: "http://maps.kosmosnimki.ru/TileService.ashx?Request=gettile&apikey=L5VW1QBBHJ&layerName=4F9F7CCCCBBC4BD08469F58C02F17AE4&crs=epsg:3857&z={zoom}&x={tilex}&y={tiley}" });
    var states = new og.layer.WMS("USA States", { isBaseLayer: false, url: "http://openglobus.org/geoserver/", layers: "topp:states", opacity: 0.5, zIndex: 50, attribution: 'USA states - geoserver WMS example', transparentColor: [1.0, 1.0, 1.0] });
    var ne = new og.layer.WMS("Natural Earth", { isBaseLayer: true, url: "http://openglobus.org/geoserver/", layers: "NaturalEarth:NE2_HR_LC_SR_W_DR", opacity: 1, zIndex: 3 });

    var terrain = new og.terrainProvider.TerrainProvider("OpenGlobus");

    var skybox = new og.node.SkyBox({
        "nx": "http://127.0.0.1/og/resources/images/skyboxes/gal/_nx.jpg",
        "px": "http://127.0.0.1/og/resources/images/skyboxes/gal/_px.jpg",
        "py": "http://127.0.0.1/og/resources/images/skyboxes/gal/_py.jpg",
        "ny": "http://127.0.0.1/og/resources/images/skyboxes/gal/_ny.jpg",
        "pz": "http://127.0.0.1/og/resources/images/skyboxes/gal/_pz.jpg",
        "nz": "http://127.0.0.1/og/resources/images/skyboxes/gal/_nz.jpg"
    });

    var controls = [
        new og.control.MouseNavigation({ autoActivate: true }),
        new og.control.KeyboardNavigation({ autoActivate: true }),
        new og.control.ToggleWireframe({ autoActivate: true }),
        /*new og.control.LoadingSpinner({ autoActivate: true }),*/
        new og.control.MousePosition({ autoActivate: true }),
        new og.control.LayerSwitcher({ autoActivate: true }),
    	new og.control.ZoomControl({ autoActivate: true })
    ];

    globus = new og.Globus({
        "target": "globus",
        "name": "Earth",
        "controls": controls,
        "skybox": skybox,
        "terrain": terrain,
        "layers": [sat, osm, hyb, states, ne],
        "autoActivated": true
    });

    globus.planet.sunlight.setSpecular(new og.math.Vector3(0.05, 0.05, 0.05));
    globus.planet.sunlight.setShininess(50);
    globus.planet.sunlight.setDiffuse(new og.math.Vector3(0.9, 0.9, 0.8));
    globus.planet.sunlight.setAmbient(new og.math.Vector3(0.15, 0.15, 0.15))
    globus.renderer.handler.backgroundColor = { r: 0.26, g: 0.26, b: 0.26 };



    globus.planet.flyLonLat(new og.LonLat(77.02815, 55.78131, 13132244.4));
    globus.fadeIn(700);

    var places = [
        { name: "Everest", lat: 27.96248, lon: 86.93361, height: 8510, alt: 16002, img: null, blb: "./resources/images/peak.png" },
        { name: "Father mountain", lat: 44.35373, lon: 146.25119, height: 1750, alt: 10594, img: null, blb: "./resources/images/peak.png" },
        { name: "Kudach", lat: 51.80633, lon: 157.53396, height: 1000, alt: 10594, img: null, blb: "./resources/images/peak.png" },
        { name: "Курильское озеро", lat: 51.45526, lon: 157.10338, height: 150, alt: 27286, img: null },
        { name: "Island", lat: 64.96372, lon: -17.87612, height: 720, alt: 515284, img: null },
        { name: "Cilaos", lat: -21.14163, lon: 55.45201, height: 3000, alt: 14033, img: null, blb: "./resources/images/island.png" },
        { name: "Ecuador", lat: -0.40913, lon: -90.95670, height: 1000, alt: 112508, img: null, blb: "./resources/images/island.png" },
        { name: "Istambul and Bosporus", lat: 41.11113, height: 500, lon: 29.06953, alt: 49235, img: null },
        { name: "Crimea", lat: 45.24066, lon: 33.96877, height: 2000, alt: 219529, img: null, blb: "./resources/images/island.png" },
        { name: "Mount Elbrus", lat: 43.351167, lon: 42.43864, height: 5660, alt: 12751.8, img: null, blb: "./resources/images/peak.png" },
        { name: "Mount Rainier", lat: 46.85320, lon: -121.75754, height: 4390, alt: 22738, img: null, blb: "./resources/images/peak.png" },
        { name: "Mount Adams", lat: 46.20357, lon: -121.49044, height: 3780, alt: 17828.7, img: null, blb: "./resources/images/peak.png" },
        { name: "Mount Saint Helen", lat: 46.19022, lon: -122.18546, height: 2540, alt: 9475.2, img: null, blb: "./resources/images/peak.png" },
        { name: "Home world", lat: 55.78131, lon: 77.02815, height: 8000, alt: 13132244.4, img: null }
    ];

    placesCollection = new og.EntityCollection();
    placesCollection.events.on("draw", placesCollection, function () {
        var maxDist = 3.57 * Math.sqrt(this.renderNode.camera._lonLat.height) * 1000;
        this.setScaleByDistance(200000, maxDist + 200000, maxDist);
    });

    placesCollection.events.on("mouseenter", null, function (e) {
        //e.pickingObject.label.setColor(1,1,0);
        globus.planet.renderer.handler.gl.canvas.classList.add("ogHandPoiner");
    });

    placesCollection.events.on("mouseleave", null, function (e) {
        //e.pickingObject.label.setColor(1,1,1);
        globus.planet.renderer.handler.gl.canvas.classList.remove("ogHandPoiner");
    });

    placesCollection.addTo(globus.planet);

    var cont = document.createElement("div");
    cont.id = "cont";
    var ul = document.createElement("ul");
    ul.classList.add("list");
    for (var i = 0; i < places.length; i++) {
        (function (li, place) {
            li.classList.add("icon");
            li.onclick = function () {
                globus.planet.flyLonLat(new og.LonLat(place.lon, place.lat, place.alt));
            };
            li.innerHTML = '<div style="width:100%; height:100%; background-color: rgba(50,50,50,0.6);">' + place.name + '</div>';
            ul.appendChild(li);


            var e = new og.Entity({
                lonlat: new og.LonLat(place.lon, place.lat, place.height),
                label: {
                    text: place.name,
                    size: 40,
                    color: new og.math.Vector4(1, 1, 1, 1),
                    outlineColor: new og.math.Vector4(0, 0, 0, 1),
                    outline: 0.45,
                    weight: "bold",
                    face: "verdana",
                    offset: [10,-2]
                },
                billboard: {
                    src: place.blb,
                    width: 40,
                    height: 40//,
                    //offset: [-5, 5]
                }
            });
            e.addTo(placesCollection);

        })(document.createElement("li"), places[i]);
    }

    cont.appendChild(ul);

    document.getElementById("globus").appendChild(cont);
};