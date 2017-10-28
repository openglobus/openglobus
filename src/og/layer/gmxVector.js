goog.provide('og.layer.GmxVector');
goog.provide('og.layer.GmxVector.CheckVersion');

goog.require('og.EntityCollection');
goog.require('og.Entity');
goog.require('og.LonLat');
goog.require('og.quadTree');
goog.require('og.quadTree.EntityCollectionQuadNode');
goog.require('og.math');
goog.require('og.inheritance');
goog.require('og.QueueArray');
goog.require('og.Geometry');
goog.require('og.GeometryHandler');
goog.require('og.ajax');

/**
 * Vector layer represents alternative entities store. Used for geospatial data rendering like
 * points, lines, polygons, geometry objects etc.
 * @class
 * @extends {og.layer.Layer}
 * @param {string} [name="noname"] - Layer name.
 * @param {Object} [options] - Layer options:
 * @param {number} [options.minZoom=0] - Minimal visible zoom. 0 is default
 * @param {number} [options.maxZoom=50] - Maximal visible zoom. 50 is default.
 * @param {string} [options.attribution] - Layer attribution.
 * @param {string} [options.zIndex=0] - Layer Z-order index. 0 is default.
 * @param {boolean} [options.visibility=true] - Layer visibility. True is default.
 * @param {boolean} [options.isBaseLayer=false] - Layer base layer. False is default.
 * @param {Array.<og.Entity>} [options.entities] - Entities array.
 * @param {Array.<number,number,number>} [options.scaleByDistance] - Scale by distance parameters.
 *      First index - near distance to the entity, after entity becomes full scale.
 *      Second index - far distance to the entity, when entity becomes zero scale.
 *      Third index - far distance to the entity, when entity becomes invisible.
 * @param {number} [options.nodeCapacity=30] - Maximum entities quantity in the tree node. Rendering optimization parameter. 30 is default.
 * @param {boolean} [options.async=true] - Asynchronous vector data handling before rendering. True for optimization huge data.
 * @param {boolean} [options.groundAlign = false] - Vector data align to the ground relief. Like points with zero altitude lay on the ground.
 *
 * @fires og.layer.GmxVector#entitymove
 * @fires og.layer.GmxVector#draw
 * @fires og.layer.GmxVector#add
 * @fires og.layer.GmxVector#remove
 * @fires og.layer.GmxVector#entityadd
 * @fires og.layer.GmxVector#entityremove
 * @fires og.layer.GmxVector#visibilitychange
 */
og.layer.GmxVector = function (name, options) {
    options = options || {};

    og.inheritance.base(this, name, options);

    this.hostUrl = options.hostUrl || "//maps.kosmosnimki.ru/";

    this._layerId = options.layerId;

    this._tileSenderUrlTemplate = '//maps.kosmosnimki.ru/TileSender.ashx?WrapStyle=None&ModeKey=tile&r=j&ftc=osm&srs=3857&LayerName={id}&z={z}&x={x}&y={y}&v={v}';

    this._gmxProperties = null;

    this._itemCache = {};

    this._tileDataCache = {};

    this._tileVersions = {};

    this._itemZIndexCounter = 0;

    this._style = options.style || {};
    this._style.fillColor = og.utils.createColorRGBA(this._style.fillColor, new og.math.Vector4(0.19, 0.62, 0.85, 0.4));
    this._style.lineColor = og.utils.createColorRGBA(this._style.lineColor, new og.math.Vector4(0.19, 0.62, 0.85, 1));
    this._style.strokeColor = og.utils.createColorRGBA(this._style.strokeColor, new og.math.Vector4(1, 1, 1, 0.95));
    this._style.lineWidth = this._style.lineWidth || 3;
    this._style.strokeWidth = this._style.strokeWidth || 0;

    this.events.registerNames(og.layer.GmxVector.EVENT_NAMES);
};

og.inheritance.extend(og.layer.GmxVector, og.layer.Layer);

og.layer.GmxVector.EVENT_NAMES = [
    /**
     * Triggered when entity has moved.
     * @event og.layer.GmxVector#draw
     */
    "entitymove",

    /**
     * Triggered when layer begin draw.
     * @event og.layer.GmxVector#draw
     */
    "draw",

    /**
     * Triggered when new entity added to the layer.
     * @event og.layer.GmxVector#entityadd
     */
    "entityadd",

    /**
     * Triggered when entity removes from the collection.
     * @event og.layer.GmxVector#entityremove
     */
    "entityremove"
];

og.layer.GmxVector.CheckVersion = function (planet) {

    this._layerVersions = {};

    this._layerEvents = {};

    this.hostUrl = "//maps.kosmosnimki.ru/";

    this._layers = [];

    this._r = null;

    this._addLayer = function (layer) {
        this._layers.push(layer);
    };

    this._removeLayer = function (layer) {
        var i = this._layers.length;
        while (i--) {
            if (layer.isEqual(this._layers[i])) {
                this._layers.splice(i, 1);
                return;
            }
        }
    };

    planet.events.on("layeradd", function (l) {
        if (l instanceof og.layer.GmxVector) {
            if (l._visibility) {
                this._addLayer(l);
            }

            var f = function (l) {
                if (l._visibility) {
                    this._addLayer(l);
                } else {
                    this._removeLayer(l);
                }
            };

            if (!this._layerEvents[l._id])
                this._layerEvents[l._id] = {};
            this._layerEvents[l._id]["visibilitychange"] = f;
            l.events.on("visibilitychange", f, this);
        }
    }, this);

    planet.events.on("layerremove", function (l) {
        if (l instanceof og.layer.GmxVector) {
            this._removeLayer(l);
            l.events.off("visibilitychange", this._layerEvents[l._id]["visibilitychange"]);
            this._layerEvents[l._id] = {};
        }
    }, this);

    planet.camera.events.on("moveend", function () {
        this._request();
    }, this);

    this.update = function () {
        this._request();
    };

    this._checkVersionSuccess = function (data, layersOrder) {
        var res = data.Result;
        for (var i = 0; i < layersOrder.length; i++) {
            layersOrder[i]._checkVersionSuccess(res[i]);
        }
    };

    this._request = function () {
        if (this._layers.length) {

            this._r && this._r.abort();

            var e = planet._viewExtentMerc,
                zoom = planet.maxCurrZoom;

            var bbox = [e.southWest.lon, e.southWest.lat, e.northEast.lon, e.northEast.lat];

            var layers = [],
                _layersOrder = [];
            for (var i = 0; i < this._layers.length; i++) {
                var li = this._layers[i];
                if (li._extentMerc.overlaps(e)) {
                    _layersOrder.push(li);
                    layers.push({ "Name": li._layerId, "Version": this._layerVersions[li._layerId] || -1 });
                }
            }

            var that = this;
            this._r = og.ajax.request(this.hostUrl + "Layer/CheckVersion.ashx", {
                'type': "POST",
                'responseType': "json",
                'data': {
                    'WrapStyle': "None",
                    'bbox': bbox,
                    'srs': "3857",
                    'layers': layers,
                    'zoom': zoom,
                    'ftc': "osm"
                },
                'success': function (data) {
                    that._r = null;
                    that._checkVersionSuccess(data, _layersOrder);
                },
                'error': function (err) {
                    that._r = null;
                    console.log(err);
                }
            });
        }
    };
};


/**
 * Represents geomixer item. Stores item attributes.
 * @class
 */
og.layer.GmxVector.Item = function (id, options) {
    options = options || {};

    this.id = id;
    this.attributes = options.attributes || {};
    this.version = options.version || -1;

    this._layer = null;
    this._style = options.style || {};
};

og.layer.GmxVector.Item.prototype.addTo = function (layer) {
    layer.addItem(this);
};


/**
 * Represents geomixer vector tile data. Stores tile geometries and rendering data.
 * @class
 */
og.layer.GmxVector.TileData = function (data, x, y, z, v) {
    this.isGeneralized = data.isGeneralized;
    this.bbox = data.bbox;
    this.version = v;
    this.items = data.values;
    this.x = x;
    this.y = y;
    this.z = z;
};

og.layer.GmxVector.TileData.prototype.setData = function (data) {
    this.isGeneralized = data.isGeneralized;
    this.bbox = data.bbox;
    this.items = data.values;
};

/**
 * Vector layer {@link og.layer.GmxVector} object factory.
 * @static
 * @param {String} name - Layer name.
 * @param {Object} options - Layer options.
 * @returns {og.layer.GmxVector} Returns vector layer.
 */
og.layer.gmxVector = function (name, options) {
    return new og.layer.GmxVector(name, options);
};

/**
 * Adds layer to the planet.
 * @public
 * @param {og.scene.RenderNode} planet - Planet scene.
 * @return {og.layer.GmxVector} - Returns og.layer.GmxVector instance.
 */
og.layer.GmxVector.prototype.addTo = function (planet) {

    //Bind checkVersion to the planet
    if (!planet._gmxCheckVersion) {
        planet._gmxCheckVersion = new og.layer.GmxVector.CheckVersion(planet);
    }

    this._assignPlanet(planet);
    this._initialize();
    return this;
};

og.layer.GmxVector.getLayerInfo = function (hostUrl, layerId, proceedCallback, errorCallback) {
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

og.layer.GmxVector.prototype._initialize = function () {
    var p = this._planet;
    var that = this;

    og.layer.GmxVector.getLayerInfo(this.hostUrl, this._layerId, function (data) {
        that._gmxProperties = data.properties;
        that.setExtent(og.Geometry.getExtent(data.geometry));
        p._gmxCheckVersion.update();
    });

    var _drawCallback = function () {
        that._drawCallback()
    };

    p.events.on("draw", _drawCallback);

    var _removeCallback = function () {
        that._planet.events.off("draw", _drawCallback);
        that._planet.events.off("remove", _removeCallback);
    };

    this.events.on("remove", _removeCallback);
    this.events.on("visibilitychange", function (e) {
        if (e._planet) {
            if (e.getVisibility()) {
                e._planet.events.on("draw", _drawCallback);
            } else {
                that._planet.events.off("draw", _drawCallback);
            }
        }
    });
};


og.layer.GmxVector.prototype._drawCallback = function () {

};

og.layer.GmxVector.prototype._checkVersionSuccess = function (prop) {
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

og.layer.GmxVector.prototype._getTile = function (x, y, z, v) {
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

og.layer.GmxVector.prototype.addItem = function (item) {
    if (!item._layer) {
        this._itemCache[item.id] = item;
        item._layer = this;
        if (this._planet) {
            this._planet.renderer.assignPickingColor(item);
        }
    }
};

og.layer.GmxVector.prototype._handleTileData = function (x, y, z, v, data) {
    var items = data.values,
        style = this._style;

    for (var i = 0; i < items.length; i++) {

        var item = items[i],
            gmxId = item[0];

        var cacheItem = this._itemCache[gmxId];

        if (!cacheItem) {
            this.addItem(new og.layer.GmxVector.Item(gmxId, {
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
        this._tileDataCache[tileIndex] = new og.layer.GmxVector.TileData(data, x, y, z, v);
    } else if (cacheTileData.version !== v) {
        cacheTileData.version = v;
        cacheTileData.setData(data);
    }
};

og.layer.GmxVector.castType = {
    "string": function (v) {
        return v != null ? v.toString() : v;
    },

    "date": function (v) {
        return v != null ? new Date(v * 1000) : v;
    },

    "datetime": function (v) {
        return v != null ? new Date(v * 1000) : v;
    },

    "time": function (v) {
        return v != null ? parseInt(v) : v;
    },

    "integer": function (v) {
        return v != null ? parseInt(v) : v;
    },

    "float": function (v) {
        return v != null ? parseFloat(v) : v;
    },

    "boolean": function (str) {
        if (str === null)
            return str;

        if (typeof str === 'boolean') {
            if (str === true)
                return true;
            return false;
        }
        if (typeof str === 'string') {
            if (str === "")
                return false;
            str = str.replace(/^\s+|\s+$/g, '');
            if (str.toLowerCase() === 'true' || str.toLowerCase() === 'yes')
                return true;
            str = str.replace(/,/g, '.');
            str = str.replace(/^\s*\-\s*/g, '-');
        }
        if (!isNaN(str))
            return parseFloat(str) !== 0;
        return false;
    }
};

og.layer.GmxVector.prototype._getAttributes = function (item) {
    var res = {},
        prop = this._gmxProperties;

    var attrs = prop.attributes,
        types = prop.attrTypes;

    for (var i = 0; i < attrs.length; i++) {
        res[attrs[i]] = og.layer.GmxVector.castType[types[i]](item[i + 1]);
    }

    return res;
};

/**
 * Start to load tile material.
 * @public
 * @virtual
 * @param {og.planetSegment.Material} material - Current material.
 */
og.layer.GmxVector.prototype.loadMaterial = function (material) {

    var seg = material.segment;

    if (this._isBaseLayer) {
        material.texture = seg._isNorth ? seg.planet.solidTextureOne : seg.planet.solidTextureTwo;
    } else {
        material.texture = seg.planet.transparentTexture;
    }

    if (this._planet.layerLock.isFree()) {
        material.isReady = false;
        material.isLoading = true;

        var data = this._getTileData(seg);

        if (data) {
            console.log("draw geometry of " + (data.x + "_" + data.y + "_" + data.z) + " in tile " + seg.tileIndex);
        } else {
            //this._pendingQueue.push(material);
            console.log("pending for " + seg.tileIndex);
        }
    }
};


og.layer.GmxVector.prototype._getTileData = function (seg) {
    var tc = this._tileDataCache;
    var data = tc[seg.tileIndex];
    if (data) {
        return data;
    } else {
        var pn = this._planet._quadTreeNodesCacheMerc[seg.tileIndex].parentNode;
        while (pn) {
            var ptc = tc[pn.planetSegment.tileIndex];
            if (ptc && !ptc.isGeneralized) {
                return ptc;
            }
            pn = pn.parentNode;
        }
    }
    return null;
};

og.layer.GmxVector.prototype.getGmxProperties = function () {
    return this._gmxProperties;
};

/**
 * Abort exact material loading.
 * @public
 * @param {og.planetSegment.Material} material - Segment material.
 */
og.layer.GmxVector.prototype.abortMaterialLoading = function (material) {
    material.isLoading = false;
    material.isReady = false;
};

og.layer.GmxVector.prototype.applyMaterial = function (material) {
    if (material.isReady) {
        return [0, 0, 1, 1];
    } else {

        !material.isLoading && this.loadMaterial(material);

        var segment = material.segment;
        var pn = segment.node,
            notEmpty = false;

        var mId = this._id;
        var psegm = material;
        while (pn.parentNode) {
            if (psegm && psegm.isReady) {
                notEmpty = true;
                break;
            }
            pn = pn.parentNode;
            psegm = pn.planetSegment.materials[mId];
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

og.layer.GmxVector.prototype.clearMaterial = function (material) {
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

