goog.provide('og.gmx.VectorLayer');

goog.require('og.ajax');
goog.require('og.utils');
goog.require('og.inheritance');
goog.require('og.layer.Layer');

goog.require('og.gmx.CheckVersion');
goog.require('og.gmx.VectorTileCreator');
goog.require('og.gmx.TileData');
goog.require('og.gmx.Item');
goog.require('og.gmx.Material');

/**
 * TODO: description
 * @class
 * @param {String} name - Layer user name.
 * @param {Object} options:
 * @extends {og.layer.Layer}
 */
og.gmx.VectorLayer = function (name, options) {
    options = options || {};

    og.inheritance.base(this, name, options);

    // this._isRasterCatalog = options.isRasterCatalog || false;

    // this._RCMinZoomForRasters = options.RCMinZoomForRasters || 0; 

    this.isVector = true;

    this.hostUrl = options.hostUrl || "//maps.kosmosnimki.ru/";

    this._initialized = false;

    this._layerId = options.layerId;

    this._tileSenderUrlTemplate = '//maps.kosmosnimki.ru/TileSender.ashx?WrapStyle=None&ModeKey=tile&r=j&ftc=osm&srs=3857&LayerName={id}&z={z}&x={x}&y={y}&v={v}';

    this._gmxProperties = null;

    this._dateBegin = options.dateBegin || null;
    this._dateEnd = options.dateEnd || null;

    this._itemCache = {};

    this._tileDataCache = {};

    this._tileVersions = {};

    this._itemZIndexCounter = 0;

    this._filterCallback = null;

    this._filteredItems = {};

    this._styleCallback = null;

    this._styledItems = {};

    this._updatedItemArr = [];
    this._updatedItems = {};

    this._style = options.style || {};
    this._style.fillColor = og.utils.createColorRGBA(this._style.fillColor, new og.math.Vector4(0.19, 0.62, 0.85, 0.57));
    this._style.lineColor = og.utils.createColorRGBA(this._style.lineColor, new og.math.Vector4(0.19, 0.62, 0.85, 1));
    this._style.strokeColor = og.utils.createColorRGBA(this._style.strokeColor, new og.math.Vector4(1, 1, 1, 0.95));
    this._style.lineWidth = this._style.lineWidth || 5;
    this._style.strokeWidth = this._style.strokeWidth || 0;

    this.events.registerNames(og.gmx.VectorLayer.EVENT_NAMES);
};

og.inheritance.extend(og.gmx.VectorLayer, og.layer.Layer);

og.gmx.VectorLayer.EVENT_NAMES = [
    "draw"
];

/**
 * Vector layer {@link og.gmx.VectorLayer} object factory.
 * @static
 * @param {String} name - Layer name.
 * @param {Object} options - Layer options.
 * @returns {og.gmx.VectorLayer} Returns vector layer.
 */
og.gmx.vectorLayer = function (name, options) {
    return new og.gmx.VectorLayer(name, options);
};

og.gmx.VectorLayer.prototype._bindPicking = function () {
    this._pickingColor.clear();
};

og.gmx.VectorLayer.prototype.createMaterial = function (segment) {
    return new og.gmx.Material(segment, this);
};

/**
 * Adds layer to the planet.
 * @public
 * @param {og.scene.RenderNode} planet - Planet scene.
 * @return {og.gmx.VectorLayer} - Returns og.gmx.VectorLayer instance.
 */
og.gmx.VectorLayer.prototype.addTo = function (planet) {

    //Bind checkVersion to the planet
    if (!planet._gmxCheckVersion) {
        planet._gmxCheckVersion = new og.gmx.CheckVersion(planet);
    }

    //Bind gmxVectorTileCreator to the planet
    if (!planet._gmxVectorTileCreator) {
        planet._gmxVectorTileCreator = new og.gmx.VectorTileCreator(planet);
    }

    this._assignPlanet(planet);

    if (this._visibility && !this._initialized) {
        this._initialize();
    }

    return this;
};

og.gmx.VectorLayer.getLayerInfo = function (hostUrl, layerId, proceedCallback, errorCallback) {
    og.ajax.request(hostUrl + "/rest/ver1/layers/" + layerId + "/info", {
        'type': "GET",
        'responseType': "json",
        'data': {
            'WrapStyle': "None"
        },
        'success': function (data) {
            proceedCallback && proceedCallback(data);
        },
        'error': function (err) {
            errorCallback && errorCallback(err);
        }
    });
};

og.gmx.VectorLayer.dateToEpoch = function (date) {
    var time = date.getTime();
    return time - time % 86400000;
};

og.gmx.VectorLayer.prototype._initialize = function () {

    this._initialized = true;

    var p = this._planet;
    var that = this;

    og.gmx.VectorLayer.getLayerInfo(this.hostUrl, this._layerId, function (data) {
        that._gmxProperties = data.properties;
        if (data.properties.Temporal) {
            var currEpoch = og.gmx.VectorLayer.dateToEpoch(new Date());
            that._beginDate = that._beginDate || new Date(currEpoch);
            that._endDate = that._endDate || new Date().setTime(currEpoch + 24 * 60 * 60 * 1000);
        }
        that.setExtent(og.Geometry.getExtent(data.geometry));
        p._gmxCheckVersion.update();
    });
};

/**
 * Sets layer visibility.
 * @public
 * @virtual
 * @param {boolean} visibility - Layer visibility.
 */
og.gmx.VectorLayer.prototype.setVisibility = function (visibility) {

    og.layer.Layer.prototype.setVisibility.call(this, visibility);

    if (this._visibility && !this._initialized) {
        this._initialize();
    }
};

og.gmx.VectorLayer.prototype._checkVersionSuccess = function (prop) {
    var to = prop.tilesOrder,
        ts = prop.tiles;
    var toSize = to.length;

    var _X = to.indexOf("X"),
        _Y = to.indexOf("Y"),
        _Z = to.indexOf("Z"),
        _V = to.indexOf("V");

    var tv = this._tileVersions;
    for (var i = 0; i < ts.length; i += toSize) {
        var x = ts[i + _X],
            y = ts[i + _Y],
            z = ts[i + _Z],
            v = ts[i + _V];
        var tileIndex = og.layer.getTileIndex(x, y, z);
        if (tv[tileIndex] !== v) {
            this._tileVersions[tileIndex] = v;
            this._getTile(x, y, z, v);
        }
    }
};

og.gmx.VectorLayer.prototype.setFilter = function (filterCallback) {
    this._filterCallback = filterCallback;
    this.updateFilter();
};

og.gmx.VectorLayer.prototype.removeFilter = function () {
    this._filterCallback = null;
    this.updateFilter();
};

og.gmx.VectorLayer.prototype.getItemVisibility = function (item) {
    if (!this._filterCallback) {
        return true;
    }
    var visibility = this._filteredItems[item.id];
    if (visibility == null) {
        visibility = this._filteredItems[item.id] = this._filterCallback[item.id](item);
    }
    return visibility;
};

og.gmx.VectorLayer.prototype.updateFilter = function () {
    this._filteredItems = {};
    //...TODO
};

og.gmx.VectorLayer.prototype.setStyleHook = function (styleCallback) {
    this._styleCallback = styleCallback;
    this.updateStyle();
};

og.gmx.VectorLayer.prototype.getItemStyle = function (item) {
    if (!this._styleCallback) {
        return item._style;
    }
    var style = this._styledItems[item.id];
    if (style == null) {
        style = this._styledItems[item.id] = this._styleCallback[item.id](item);
    }
    return style;
};

og.gmx.VectorLayer.prototype.updateStyle = function () {
    this._styledItems = {};
    //...TODO
};

og.gmx.VectorLayer.prototype._getTile = function (x, y, z, v) {
    var url = og.utils.stringTemplate(this._tileSenderUrlTemplate, {
        "id": this._layerId,
        "x": x.toString(), "y": y.toString(), "z": z.toString(),
        "v": v.toString()
    });

    var that = this;
    og.ajax.request(url, {
        'type': "GET",
        'responseType': "text",
        'success': function (dataStr) {
            var data = JSON.parse(dataStr.substring(dataStr.indexOf('{'), dataStr.lastIndexOf('}') + 1));
            that._handleTileData(x, y, z, v, data);
        },
        'error': function (err) {
            console.log(err);
        }
    });
};

og.gmx.VectorLayer.prototype.addItem = function (item) {
    if (!item._layer) {
        this._itemCache[item.id] = item;
        item._layer = this;
        if (this._planet) {
            this._planet.renderer.assignPickingColor(item);
        }
    }
};

og.gmx.VectorLayer.prototype._handleTileData = function (x, y, z, v, data) {
    var items = data.values,
        style = this._style;

    for (var i = 0; i < items.length; i++) {

        var item = items[i],
            gmxId = item[0];

        var cacheItem = this._itemCache[gmxId];

        if (!cacheItem) {
            this.addItem(new og.gmx.Item(gmxId, {
                'attributes': this._getAttributes(item),
                'version': v,
                'style': {
                    'fillColor': style.fillColor,
                    'lineColor': style.lineColor,
                    'strokeColor': style.strokeColor,
                    'lineWidth': style.lineWidth,
                    'strokeWidth': style.strokeWidth,
                    'zIndex': this._itemZIndexCounter++
                }
            }));
        } else if (cacheItem.version !== v) {
            cacheItem.version = v;
            cacheItem.attributes = this._getAttributes(item);
        }
    }

    var tileIndex = og.layer.getTileIndex(x, y, z),
        cacheTileData = this._tileDataCache[tileIndex];

    if (!cacheTileData) {
        cacheTileData = this._tileDataCache[tileIndex] = new og.gmx.TileData(this, data, x, y, z, v);
    } else if (cacheTileData.version !== v) {
        cacheTileData.version = v;
        cacheTileData.setData(data);
        cacheTileData.isReady = false;
    }

    //TODO: replace it to webworker
    for (i = 0; i < cacheTileData.items.length; i++) {
        cacheTileData.items[i].createBuffers(this._planet.renderer.handler, cacheTileData.extent);
    }
};

og.gmx.VectorLayer.prototype._getAttributes = function (item) {
    var res = {},
        prop = this._gmxProperties;

    var attrs = prop.attributes,
        types = prop.attrTypes;

    for (var i = 0; i < attrs.length; i++) {
        res[attrs[i]] = og.utils.castType[types[i]](item[i + 1]);
    }

    return res;
};

/**
 * Start to load tile material.
 * @public
 * @virtual
 * @param {og.planetSegment.Material} material - Current material.
 */
og.gmx.VectorLayer.prototype.loadMaterial = function (material) {

    var seg = material.segment;

    if (seg._projection.id !== og.proj.EPSG3857.id) {
        material.textureNotExists();
        return;
    }

    if (this._isBaseLayer) {
        material.texture = seg._isNorth ? seg.planet.solidTextureOne : seg.planet.solidTextureTwo;
    } else {
        material.texture = seg.planet.transparentTexture;
    }

    if (this._planet.layerLock.isFree()) {
        var tileData = this._getTileData(seg);
        if (tileData) {
            material.isReady = false;
            material.isLoading = true;
            this._planet._gmxVectorTileCreator.add({
                'material': material,
                'tileData': tileData
            });
        }
    }
};


og.gmx.VectorLayer.prototype._getTileData = function (seg) {
    var tc = this._tileDataCache;
    var data = tc[seg.tileIndex];
    if (data) {
        return data;
    } else {
        var pn = this._planet._quadTreeNodesCacheMerc[seg.tileIndex].parentNode;
        while (pn) {
            var ptc = tc[pn.planetSegment.tileIndex];
            if (ptc) {
                return ptc;
            }
            pn = pn.parentNode;
        }
    }
    return null;
};

og.gmx.VectorLayer.prototype.getGmxProperties = function () {
    return this._gmxProperties;
};

/**
 * Abort exact material loading.
 * @public
 * @param {og.planetSegment.Material} material - Segment material.
 */
og.gmx.VectorLayer.prototype.abortMaterialLoading = function (material) {
    material.isLoading = false;
    material.isReady = false;
};

og.gmx.VectorLayer.prototype.applyMaterial = function (material) {
    if (material.isReady) {
        return [0, 0, 1, 1];
    } else {

        !material.isLoading && this.loadMaterial(material);

        var segment = material.segment;
        var pn = segment.node,
            notEmpty = false;

        var mId = this._id;
        var psegm = material;
        var i = 0;
        while (pn.parentNode && i < 2) {
            if (psegm && psegm.isReady) {
                notEmpty = true;
                break;
            }
            pn = pn.parentNode;
            psegm = pn.planetSegment.materials[mId];
            i++;
        }

        if (notEmpty) {
            material.appliedNodeId = pn.nodeId;
            material.texture = psegm.texture;
            material.pickingMask = psegm.pickingMask;
            var dZ2 = 1.0 / (2 << (segment.tileZoom - pn.planetSegment.tileZoom - 1));
            return [
                segment.tileX * dZ2 - pn.planetSegment.tileX,
                segment.tileY * dZ2 - pn.planetSegment.tileY,
                dZ2,
                dZ2
            ];
        } else {
            if (material.textureExists && material._updateTexture) {
                material.texture = material._updateTexture;
                material.pickingMask = material._updatePickingMask;
            } else {
                material.texture = segment.planet.transparentTexture;
                material.pickingMask = segment.planet.transparentTexture;
            }
            return [0, 0, 1, 1];
        }
    }
};

og.gmx.VectorLayer.prototype.clearMaterial = function (material) {
    if (material.isReady) {
        var gl = material.segment.handler.gl;

        material.isReady = false;
        material.pickingReady = false;

        var t = material.texture;
        material.texture = null;
        t && !t.default && gl.deleteTexture(t);

        t = material.pickingMask;
        material.pickingMask = null;
        t && !t.default && gl.deleteTexture(t);

        t = material._updateTexture;
        material._updateTexture = null;
        t && !t.default && gl.deleteTexture(t);

        t = material._updatePickingMask;
        material._updatePickingMask = null;
        t && !t.default && gl.deleteTexture(t);
    }

    this.abortMaterialLoading(material);

    material.isLoading = false;
    material.textureExists = false;
};

og.gmx.VectorLayer.prototype._refreshRecursevely = function (item, treeNode) {
    var lid = this._id;
    for (var i = 0; i < treeNode.nodes.length; i++) {
        var ni = treeNode.nodes[i];
        if (item._renderedBounds.overlaps(ni.planetSegment._extent)) {
            this._refreshRecursevely(item, ni);
            var m = ni.planetSegment.materials[lid];
            if (m && m.isReady) {
                if (m.segment.node.getState() !== og.quadTree.RENDERING) {
                    m.layer.clearMaterial(m);
                } else {
                    m.isReady = false;
                    m._updateTexture = m.texture;
                    m._updatePickingMask = m.pickingMask;
                    //m.pickingReady = m.pickingReady && item._pickingReady;
                }
                //item._pickingReady = true;
            }
        }
    }
};

og.gmx.VectorLayer.prototype._refreshPlanetNode = function (treeNode) {
    for (var i = 0, items = this._updatedItemArr; i < items.length; i++) {
        this._refreshRecursevely(items[i], treeNode);
    }
};

og.gmx.VectorLayer.prototype._updatePlanet = function () {
    if (this._updatedItemArr.length) {
        if (this._planet) {
            this._refreshPlanetNode(this._planet._quadTree);
        }
        this._updatedItemArr.length = 0;
        this._updatedItemArr = [];
        this._updatedItems = {};
    }
};

og.gmx.VectorLayer.prototype.updateItems = function (items) {
    for (var i = 0; i < items.length; i++) {
        this.updateItem(items[i]);
    }
};

og.gmx.VectorLayer.prototype.updateItem = function (item) {
    if (item._renderedBounds) {
        this._updatedItemArr.push(item);
        this._updatedItems[item.id] = item;
    }
};

og.gmx.VectorLayer.prototype.update = function () {
    this._updatePlanet();
    this.events.dispatch(this.events.draw, this);
};

og.gmx.VectorLayer.prototype.setStyle = function (style) {
    //...
};

og.gmx.VectorLayer.prototype.setDateInterval = function (beginDate, endDate) {
    this._beginDate = beginDate;
    this._endDate = endDate;
    //...
};