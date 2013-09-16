og.layer.MapServers = {
    "MapQuest": { url: "http://otile1.mqcdn.com/tiles/1.0.0/map/{zoom}/{tilex}/{tiley}.jpg", maxZoom: -1 },
    "MapQuestSat": { url: "http://http://otile1.mqcdn.com/tiles/1.0.0/sat/{zoom}/{tilex}/{tiley}.jpg", maxZoom: -1 },
    "GoogleMap": { url: "http://mt1.google.com/vt/lyrs=m&hl=ru&x={tilex}&y={tiley}&z={zoom}", maxZoom: -1 },
    "GoogleTerrain": { url: "http://mt1.google.com/vt/lyrs=p&hl=ru&x={tilex}&y={tiley}&z={zoom}", maxZoom: -1 },
    "GoogleSat": { url: "http://mt1.google.com/vt/lyrs=s&hl=ru&x={tilex}&y={tiley}&z={zoom}", maxZoom: -1 },
    "GoogleHibrid": { url: "http://mt1.google.com/vt/lyrs=y&hl=ru&x={tilex}&y={tiley}&z={zoom}", maxZoom: -1 },
    "OSM": { url: "http://a.tile.openstreetmap.org/{zoom}/{tilex}/{tiley}.png", maxZoom: -1 },
    "OSMb": { url: "http://b.tile.opencyclemap.org/cycle/{zoom}/{tilex}/{tiley}.png", maxZoom: -1 },
    "ArcGISWorldImagery": { url: "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{zoom}/{tilx}/{tiley}", maxZoom: -1 },
    "ArcGISWorldStreetMap": { url: "http://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{zoom}/{tilx}/{tiley}", maxZoom: -1 },
    "ArcGISNatGeo": { url: "http://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{zoom}/{tilx}/{tiley}", maxZoom: -1 },
    "Cosmosnimki": { url: "http://maps.kosmosnimki.ru/TileService.ashx?Request=gettile&apikey=L5VW1QBBHJ&layerName=4F9F7CCCCBBC4BD08469F58C02F17AE4&crs=epsg:3857&z={zoom}&x={tilex}&y={tiley}", maxZoom: -1 },
};

og.layer.MapServersProxy = {
    "MapQuest": { url: "http://127.0.0.1/tiles/1.0.0/map/{zoom}/{tilex}/{tiley}.jpg", maxZoom: -1 },
    "MapQuestSat": { url: "http://127.0.0.1/tiles/1.0.0/sat/{zoom}/{tilex}/{tiley}.jpg", maxZoom: -1 },
    "GoogleMap": { url: "http://mt1.google.com/vt/lyrs=m&hl=ru&x={tilex}&y={tiley}&z={zoom}", maxZoom: -1 },
    "GoogleTerrain": { url: "http://mt1.google.com/vt/lyrs=p&hl=ru&x={tilex}&y={tiley}&z={zoom}", maxZoom: -1 },
    "GoogleSat": { url: "http://mt1.google.com/vt/lyrs=s&hl=ru&x={tilex}&y={tiley}&z={zoom}", maxZoom: -1 },
    "GoogleHibrid": { url: "http://mt1.google.com/vt/lyrs=y&hl=ru&x={tilex}&y={tiley}&z={zoom}", maxZoom: -1 },
    "OSM": { url: "http://127.0.0.1/osm/{zoom}/{tilex}/{tiley}.png", maxZoom: -1 },
    "OSMb": { url: "http://127.0.0.1/osmb/cycle/{zoom}/{tilex}/{tiley}.png", maxZoom: -1 },
    "ArcGISWorldImagery": { url: "http://127.0.0.1/ArcGIS/rest/services/World_Imagery/MapServer/tile/{zoom}/{tiley}/{tilex}", maxZoom: -1 },
    "ArcGISWorldStreetMap": { url: "http://127.0.0.1/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{zoom}/{tiley}/{tilex}", maxZoom: -1 },
    "ArcGISNatGeo": { url: "http://127.0.0.1/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{zoom}/{tiley}/{tilex}", maxZoom: -1 },
    "Cosmosnimki": { url: "http://127.0.0.1/TileService.ashx?Request=gettile&apikey=L5VW1QBBHJ&layerName=4F9F7CCCCBBC4BD08469F58C02F17AE4&crs=epsg:3857&z={zoom}&x={tilex}&y={tiley}", maxZoom: -1 },
};


og.layer.XYZ = function (name, options) {
    og.layer.XYZ.superclass.constructor.call(this, name, options);
}

og._class_.extend(og.layer.XYZ, og.layer.Layer);

og.layer.XYZ.prototype.handleSegmentTile = function (segment) {
    if (this.counter >= this.MAX_LOADING_TILES) {
        this.pendingsQueue.push(segment);
    } else {
        this.loadSegmentTileImage(segment);
    }
}

og.layer.XYZ.prototype.GetHTTPRequestString = function (segment) {
    return og.layer.replaceTemplate(this.url, { "tilex": segment.tileX.toString(), "tiley": segment.tileY.toString(), "zoom": segment.zoomIndex.toString() });
}

og.layer.XYZ.prototype.loadSegmentTileImage = function (segment) {
    var that = this;
    this.counter++;
    var img = new Image();
    img.onload = function () {
        segment.applyTexture.call(segment, this);
        that.dequeueRequest();
    };

    img.onerror = function () {
        if (segment) {
            segment.textureNotExists.call(segment);
        }
        that.dequeueRequest();
    };

    img.src = this.GetHTTPRequestString(segment);
}

og.layer.XYZ.prototype.dequeueRequest = function () {
    this.counter--;
    if (this.pendingsQueue.length) {
        if (this.counter < this.MAX_LOADING_TILES) {
            var pseg;
            if (pseg = this.whilePendings())
                this.loadSegmentTileImage.call(this, pseg);
        }
    }
}

og.layer.XYZ.prototype.whilePendings = function () {
    while (this.pendingsQueue.length) {
        var pseg = this.pendingsQueue.pop();
        if (pseg) {
            if (pseg.node.getState() != og.node.planet.quadTree.QuadNode.NOTRENDERING) {
                return pseg;
            } else {
                pseg.imageIsLoading = false;
            }
        }
    }
    return null;
}