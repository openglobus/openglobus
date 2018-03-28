/**
 * @module og/gmx/GmxVector
 */

'use strict';

import * as utils from '../../utils/shared.js';
import { ajax } from '../../ajax.js';
import { EPSG3857 } from '../../proj/EPSG3857.js';
import { Extent } from '../../Extent.js';
import { Geometry } from '../../entity/Geometry.js';
import { GmxCheckVersion } from './GmxCheckVersion.js';
import { GmxItem } from './GmxItem.js';
import { GmxMaterial } from './GmxMaterial.js';
import { GmxTileData } from './GmxTileData.js';
import { GmxTileItem } from './GmxTileItem.js';
import { GmxTileDataGroup } from './GmxTileDataGroup.js';
import { GmxVectorTileCreator } from './GmxVectorTileCreator.js';
import { isEmpty } from '../../utils/shared.js';
import { Layer } from '../../layer/Layer.js';
import { QueueArray } from '../../QueueArray.js';
import { RENDERING } from '../../quadTree/quadTree.js';
import { Vec4 } from '../../math/Vec4.js';

const TileSenderUrlImagery = '//maps.kosmosnimki.ru/TileSender.ashx?ModeKey=tile&ftc=osm&x={x}&y={y}&z={z}&srs=3857&LayerName={l}';
const TileSenderUrlTemporal = '//maps.kosmosnimki.ru/TileSender.ashx?WrapStyle=None&ModeKey=tile&r=j&ftc=osm&srs=3857&LayerName={id}&z={z}&x={x}&y={y}&v={v}&Level={level}&Span={span}';
const TileSenderUrl = '//maps.kosmosnimki.ru/TileSender.ashx?WrapStyle=None&ModeKey=tile&r=j&ftc=osm&srs=3857&LayerName={id}&z={z}&x={x}&y={y}&v={v}';

let __requestsCounter = 0;
const MAX_REQUESTS = 15;

const EVENT_NAMES = [
    "draw",

    /**
     * Triggered when current tile image has loaded before rendereing.
     * @event og.gmx.VectorLayer#load
     */
    "load",

    /**
     * Triggered when all tiles have loaded or loading has stopped.
     * @event og.gmx.VectorLayer#loadend
     */
    "loadend"
];

/**
 * TODO: description
 * @class
 * @param {String} name - Layer user name.
 * @param {Object} options:
 * @extends {og.layer.Layer}
 */
class GmxVector extends Layer {
    constructor(name, options) {

        super(name, options);

        options = options || {};

        this.isVector = true;

        this.hostUrl = options.hostUrl || "//maps.kosmosnimki.ru/";

        this._pickingEnabled = options.pickingEnabled !== undefined ? options.pickingEnabled : true;

        this._initialized = false;

        this._layerId = options.layerId;

        this._tileSenderUrlTemplate = '//maps.kosmosnimki.ru/TileSender.ashx?WrapStyle=None&ModeKey=tile&r=j&ftc=osm&srs=3857&LayerName={id}&z={z}&x={x}&y={y}&v={v}';

        this._gmxProperties = null;

        this._beginDate = options.beginDate || null;

        this._endDate = options.endDate || null;

        this._itemCache = {};

        this._tileDataGroupCache = {};

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
        this._style.fillColor = utils.createColorRGBA(this._style.fillColor, new Vec4(0.19, 0.62, 0.85, 0.57));
        this._style.lineColor = utils.createColorRGBA(this._style.lineColor, new Vec4(0.19, 0.62, 0.85, 1));
        this._style.strokeColor = utils.createColorRGBA(this._style.strokeColor, new Vec4(1, 1, 1, 0.95));
        this._style.lineWidth = this._style.lineWidth || 5;
        this._style.strokeWidth = this._style.strokeWidth || 0;

        this.events.registerNames(EVENT_NAMES);

        this._needRefresh = false;

        this._tileDataGroupQueue = new QueueArray();

        /**
         * Current loading tiles couter.
         * @protected
         * @type {number}
         */
        this._vecCounter = 0;

        /**
         * Tile pending queue that waiting for loading.
         * @protected
         * @type {Array.<og.planetSegment.Material>}
         */
        this._vecPendingsQueue = new QueueArray();
    }

    static getLayerInfo(hostUrl, layerId, proceedCallback, errorCallback) {
        ajax.request(hostUrl + "/rest/ver1/layers/" + layerId + "/info", {
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
    }

    static dateToEpoch(date) {
        var time = date.getTime();
        return time - time % 86400000;
    }

    _bindPicking() {
        this._pickingColor.clear();
    }

    createMaterial(segment) {
        return new GmxMaterial(segment, this);
    }

    /**
     * Adds layer to the planet.
     * @public
     * @param {og.scene.RenderNode} planet - Planet scene.
     * @return {og.gmx.VectorLayer} - Returns og.gmx.VectorLayer instance.
     */
    addTo(planet) {

        //Bind checkVersion to the planet
        if (!planet._gmxCheckVersion) {
            planet._gmxCheckVersion = new GmxCheckVersion(planet);
        }

        //Bind gmxVectorTileCreator to the planet
        if (!planet._gmxVectorTileCreator) {
            planet._gmxVectorTileCreator = new GmxVectorTileCreator(planet);
        }

        this._assignPlanet(planet);

        if (this._visibility && !this._initialized) {
            this._initialize();
        }

        return this;
    }

    /**
     * Removes from planet.
     * @public
     * @returns {og.gmx.VectorLayer.Layer} -This layer.
     */
    remove() {
        super.remove();

        this._planet && this._planet.events.off("draw", this._onRefreshNodes);
        this._initialized = false;
        return this;
    }

    _initialize() {

        this._initialized = true;

        var p = this._planet;
        var that = this;

        GmxVector.getLayerInfo(this.hostUrl, this._layerId, function (data) {
            that._gmxProperties = data.properties;
            if (data.properties.Temporal) {
                var d = new Date();
                var currEpoch = GmxVector.dateToEpoch(d);
                that._beginDate = that._beginDate || new Date(currEpoch);
                that._endDate = that._endDate || new Date(d.setTime(currEpoch + 24 * 60 * 60 * 1000));
                that._tileSenderUrlTemplate = TileSenderUrlTemporal;
                that._tileImageryUrlTemplate = TileSenderUrlImagery;
            } else {
                that._tileSenderUrlTemplate = TileSenderUrl;
            }
            that.setExtent(Geometry.getExtent(data.geometry));
            p._gmxCheckVersion.update();
        });
    }

    /**
     * Sets layer visibility.
     * @public
     * @virtual
     * @param {boolean} visibility - Layer visibility.
     */
    setVisibility(visibility) {

        super.setVisibility(visibility);

        if (visibility) {
            this._planet && this._planet.events.on("draw", this._onRefreshNodes, this);
        } else {
            this._planet && this._planet.events.off("draw", this._onRefreshNodes);
        }

        if (this._visibility && !this._initialized) {
            this._initialize();
        }
    }

    _checkVersionSuccess(prop) {
        var to = prop.tilesOrder,
            ts = prop.tiles;
        var toSize = to.length;

        var _X = to.indexOf("X"),
            _Y = to.indexOf("Y"),
            _Z = to.indexOf("Z"),
            _V = to.indexOf("V"),
            _LEVEL = to.indexOf("Level"),
            _SPAN = to.indexOf("Span");

        var tv = this._tileVersions;
        for (var i = 0; i < ts.length; i += toSize) {
            var x = ts[i + _X],
                y = ts[i + _Y],
                z = ts[i + _Z],
                v = ts[i + _V],
                level = ts[i + _LEVEL],
                span = ts[i + _SPAN];

            var tileIndex = Layer.getTileIndex(x, y, z, level, span);
            if (tv[tileIndex] !== v) {
                this._tileVersions[tileIndex] = v;
                this._vecLoadTileData({
                    'id': this._layerId,
                    'x': x.toString(), 'y': y.toString(), 'z': z.toString(),
                    'v': v.toString(), "level": level.toString(), "span": span.toString()
                });
            }
        }
    }

    setFilter(filterCallback) {
        this._filterCallback = filterCallback;
        this.updateFilter();
    }

    removeFilter() {
        this._filterCallback = null;
        this.updateFilter();
    }

    getItemVisibility(item) {
        if (!this._filterCallback) {
            return true;
        }
        var visibility = this._filteredItems[item.id];
        if (isEmpty(visibility)) {
            visibility = this._filteredItems[item.id] = this._filterCallback[item.id](item);
        }
        return visibility;
    }

    updateFilter() {
        this._filteredItems = {};
        //...T
        ODO
    }

    setStyleHook(styleCallback) {
        this._styleCallback = styleCallback;
        this.updateStyle();
    }

    getItemStyle(item) {
        if (!this._styleCallback) {
            return item._style;
        }
        var style = this._styledItems[item.id];
        if (isEmpty(style)) {
            style = this._styledItems[item.id] = this._styleCallback[item.id](item);
        }
        return style;
    }

    updateStyle() {
        this._styledItems = {};
        //...TODO
    }

    _vecLoadTileData(t) {
        if (__requestsCounter >= MAX_REQUESTS && this._vecCounter) {
            this._vecPendingsQueue.push(t);
        } else {
            this._vecExec(t);
        }
    }

    _vecExec(t) {

        var url = utils.stringTemplate(this._tileSenderUrlTemplate, t);

        __requestsCounter++;
        this._vecCounter++;

        var that = this;
        ajax.request(url, {
            'type': "GET",
            'responseType': "text",
            'success': function (dataStr) {
                __requestsCounter--;
                that._vecCounter--;

                var data = JSON.parse(dataStr.substring(dataStr.indexOf('{'), dataStr.lastIndexOf('}') + 1));

                that._handleTileData(t, data);

                var e = that.events.load;
                if (e.handlers.length) {
                    that.events.dispatch(e, data);
                }

                that._vecDequeueRequest();
            },
            'error': function (err) {
                __requestsCounter--;
                that._vecCounter--;

                console.log(err);

                that._vecDequeueRequest();
            }
        });
    }

    _vecDequeueRequest() {
        if (this._vecPendingsQueue.length) {
            if (__requestsCounter < MAX_REQUESTS) {
                var t = this._vecWhilePendings();
                if (t)
                    this._vecExec.call(this, t);
            }
        } else if (this._vecCounter === 0) {
            var e = this.events.loadend;
            if (e.handlers.length) {
                this.events.dispatch(e);
            }
        }
    }

    _vecWhilePendings() {
        while (this._vecPendingsQueue.length) {
            return this._vecPendingsQueue.pop();
        }
    }

    addItem(item) {
        if (!item._layer) {
            this._itemCache[item.id] = item;
            item._layer = this;
            if (this._planet) {
                this._planet.renderer.assignPickingColor(item);
            }
        }
    }

    _getAttributes(item) {
        var res = {},
            prop = this._gmxProperties;

        var attrs = prop.attributes,
            types = prop.attrTypes;

        for (var i = 0; i < attrs.length; i++) {
            res[attrs[i]] = utils.castType[types[i]](item[i + 1]);
        }

        return res;
    }

    getStyle() {

    }

    _handleTileData(t, data) {

        var items = data.values,
            style = this._style,
            v = data.v;

        var h = this._planet.renderer.handler;

        var tileIndex = Layer.getTileIndex(t.x, t.y, t.z),
            tileExtent = Extent.fromTile(t.x, t.y, t.z),
            cacheTileDataGroup = this._tileDataGroupCache[tileIndex];

        if (!cacheTileDataGroup) {
            cacheTileDataGroup = this._tileDataGroupCache[tileIndex] = new GmxTileDataGroup(this, tileExtent);
        }

        var tileData = new GmxTileData(data),
            tileDataCacheIndex = Layer.getTileIndex(tileIndex, t.level, t.span);

        var cacheTileData = this._tileDataCache[tileDataCacheIndex];

        if (cacheTileData) {
            //Update tile version.Remove it before update.
            this._tileDataCache[tileDataCacheIndex] = tileData;
            cacheTileDataGroup.removeTileData(cacheTileData);
        }

        cacheTileDataGroup.addTileData(tileData);

        for (var i = 0; i < items.length; i++) {

            var item = items[i],
                gmxId = item[0];

            var cacheItem = this._itemCache[gmxId];

            if (!cacheItem) {
                cacheItem = new GmxItem(gmxId, {
                    'attributes': this._getAttributes(item),
                    'version': v,
                    'style': {
                        'fillColor': style.fillColor.clone(),
                        'lineColor': style.lineColor.clone(),
                        'strokeColor': style.strokeColor.clone(),
                        'lineWidth': style.lineWidth,
                        'strokeWidth': style.strokeWidth,
                        'zIndex': this._itemZIndexCounter++
                    }
                });

                this.addItem(cacheItem);

            } else if (cacheItem.version !== v) {
                cacheItem.version = v;
                cacheItem.attributes = this._getAttributes(item);

                //TODO: Has to be tested
                cacheItem._extent = null;
            }

            var ti = new GmxTileItem(cacheItem, item[item.length - 1]);

            ti.createBuffers(h, tileExtent);

            tileData.addTileItem(ti);
            cacheTileDataGroup.addTileItem(ti);
        }

        this._tileDataGroupQueue.push(cacheTileDataGroup);

        this._needRefresh = true;
    }

    _onRefreshNodes(p) {

        utils.print2d("l4", `_rNodes: ${this._planet._renderedNodes.length}`, 100, 25);
        utils.print2d("l3", `zMinMax: ${this._planet.minCurrZoom}, ${this._planet.maxCurrZoom}`, 100, 50);
        utils.print2d("l1", `loading: ${this._vecCounter}, ${this._vecPendingsQueue.length}`, 100, 100);
        utils.print2d("l2", `drawing: ${this._planet._gmxVectorTileCreator._queue.length}`, 100, 150);

        if (this._needRefresh && this._planet) {
            while (this._tileDataGroupQueue.length) {
                var t = this._tileDataGroupQueue.pop();
                this._refreshRecursevelyExtent(t.tileExtent, this._planet._quadTree);
            }
            this._needRefresh = false;
        }

        //->
        //this.loadMaterial goes next.
    }

    _refreshRecursevelyExtent(extent, treeNode) {
        var lid = this._id;
        for (var i = 0; i < treeNode.nodes.length; i++) {
            var ni = treeNode.nodes[i];
            if (extent.overlaps(ni.segment._extent)) {
                this._refreshRecursevelyExtent(extent, ni);
                var m = ni.segment.materials[lid];
                if (m) {
                    if (m.segment.node.getState() !== RENDERING) {
                        m.layer.clearMaterial(m);
                    } else {
                        if (m.isReady) {
                            m.isReady = false;
                            m._updateTexture = m.texture;
                            m._updatePickingMask = m.pickingMask;
                            m.pickingReady = false;//m.pickingReady && item._pickingReady;
                        }
                        m.isLoading = false;
                        m.fromTile = null;
                    }
                    //item._pickingReady = true;
                }
            }
        }
    }

    /**
     * Start to load tile material.
     * @public
     * @virtual
     * @param {og.planetSegment.Material} material - Current material.
     */
    loadMaterial(material) {

        var seg = material.segment;

        if (seg._projection.id !== EPSG3857.id) {
            material.textureNotExists();
            return;
        }

        if (this._isBaseLayer) {
            material.texture = seg._isNorth ? seg.planet.solidTextureOne : seg.planet.solidTextureTwo;
        } else {
            material.texture = seg.planet.transparentTexture;
        }

        if (this._planet.layerLock.isFree()) {
            var tileDataGroup = this._getTileDataGroup(seg);
            if (tileDataGroup) {
                material.isReady = false;
                material.isLoading = true;
                material.fromTile = tileDataGroup;
                this._planet._gmxVectorTileCreator.add({
                    'material': material,
                    'fromTile': tileDataGroup
                });
            }
        }
    }

    _getTileDataGroup(seg) {
        var tgc = this._tileDataGroupCache;
        var data = tgc[seg.tileIndex];
        if (data) {
            return data;
        } else {
            var pn = this._planet._quadTreeNodesCacheMerc[seg.tileIndex].parentNode;
            while (pn) {
                var ptc = tgc[pn.segment.tileIndex];
                if (ptc) {
                    return ptc;
                }
                pn = pn.parentNode;
            }
        }
        return null;
    }

    getGmxProperties() {
        return this._gmxProperties;
    }

    _loadScene(tileItem, material) {

        const item_id = tileItem.item.id;

        let seg = material.segment;

        material.sceneIsLoading[item_id] = true;

        var url = utils.stringTemplate(this._tileImageryUrlTemplate, {
            'x': seg.tileX,
            'y': seg.tileY,
            'z': seg.tileZoom,
            'l': tileItem.item.attributes.GMX_RasterCatalogID
        });

        this._planet._tileLoader.load({
            'src': url,
            'type': 'imageBitmap',
            'filter': () => seg.ready && seg.node.getState() === RENDERING,
            'options': {}
        }, (response) => {
            if (response.status === "ready") {
                if (material.isLoading) {
                    let e = this.events.load;
                    if (e.handlers.length) {
                        this.events.dispatch(e, material);
                    }
                    material.applySceneBitmapImage(item_id, response.data);
                }
            } else if (response.status === "abort") {
                material.sceneIsLoading[item_id] = false;
            } else if (response.status === "error") {
                if (material.sceneIsLoading[item_id] === true) {
                    material.sceneNotExists(item_id);
                }
            }
        });
    }

    applySceneTexture(tileItem, material) {

        const item_id = tileItem.item.id;

        if (material.sceneIsReady[item_id]) {
            return [0, 0, 1, 1];
        } else {

            if (!material.sceneIsLoading[item_id]) {
                this._loadScene(tileItem, material);
            }

            var segment = material.segment;
            var pn = segment.node,
                notEmpty = false;

            var mId = this._id;
            var psegm = material;
            while (pn.parentNode) {
                if (psegm && psegm.sceneIsReady[item_id]) {
                    notEmpty = true;
                    break;
                }
                pn = pn.parentNode;
                psegm = pn.segment.materials[mId];
            }

            if (notEmpty) {
                material.sceneTexture[item_id] = psegm.sceneTexture[item_id];
                var dZ2 = 1.0 / (2 << (segment.tileZoom - pn.segment.tileZoom - 1));
                return [
                    segment.tileX * dZ2 - pn.segment.tileX,
                    segment.tileY * dZ2 - pn.segment.tileY,
                    dZ2,
                    dZ2
                ];
            } else {
                material.sceneTexture[item_id] = segment.planet.transparentTexture;
                return [0, 0, 1, 1];
            }
        }
    }

    /**
     * Abort exact material loading.
     * @public
     * @param {og.planetSegment.Material} material - Segment material.
     */
    abortMaterialLoading(material) {
        material.abort();
    }

    applyMaterial(material) {
        if (material.isReady) {
            return [0, 0, 1, 1];
        } else {

            !material.isLoading && this.loadMaterial(material);

            var segment = material.segment;
            var pn = segment.node,
                notEmpty = false;

            var mId = this._id;
            var psegm = material;
            //var i = 0;
            while (pn.parentNode /*&& i < 2*/) {
                if (psegm && psegm.isReady) {
                    notEmpty = true;
                    break;
                }
                pn = pn.parentNode;
                psegm = pn.segment.materials[mId];
                //i++;
            }

            if (notEmpty) {
                material.appliedNodeId = pn.nodeId;
                material.texture = psegm.texture;
                material.pickingMask = psegm.pickingMask;
                var dZ2 = 1.0 / (2 << (segment.tileZoom - pn.segment.tileZoom - 1));
                return [
                    segment.tileX * dZ2 - pn.segment.tileX,
                    segment.tileY * dZ2 - pn.segment.tileY,
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
    }

    clearMaterial(material) {
        material.clear();
    }

    _refreshRecursevely(item, treeNode) {
        var lid = this._id;
        for (var i = 0; i < treeNode.nodes.length; i++) {
            var ni = treeNode.nodes[i];
            if (item._extent.overlaps(ni.segment._extent)) {
                this._refreshRecursevely(item, ni);
                var m = ni.segment.materials[lid];
                if (m && m.isReady) {
                    if (m.segment.node.getState() !== RENDERING) {
                        m.layer.clearMaterial(m);
                    } else {
                        m.pickingReady = m.pickingReady && item._pickingReady;
                        m.isReady = false;
                        m._updateTexture = m.texture;
                        m._updatePickingMask = m.pickingMask;
                    }
                    item._pickingReady = true;
                }
            }
        }
    }

    _refreshPlanetNode(treeNode) {
        for (var i = 0, items = this._updatedItemArr; i < items.length; i++) {
            this._refreshRecursevely(items[i], treeNode);
        }
    }

    _updatePlanet() {
        if (this._updatedItemArr.length) {
            if (this._planet) {
                this._refreshPlanetNode(this._planet._quadTree);
            }
            this._updatedItemArr.length = 0;
            this._updatedItemArr = [];
            this._updatedItems = {};
        }
    }

    updateItems(items) {
        for (var i = 0; i < items.length; i++) {
            this.updateItem(items[i]);
        }
    }

    updateItem(item) {
        if (item._extent) {
            this._updatedItemArr.push(item);
            this._updatedItems[item.id] = item;
        }
    }

    update() {
        this._updatePlanet();
        this.events.dispatch(this.events.draw, this);
    }

    setStyle(style) {
        //...
    }

    clear() {
        this._itemCache = {};
        this._tileDataCache = {};
        this._tileDataGroupCache = {};
        this._tileVersions = {};
    }

    refresh() {
        if (this._gmxProperties) {
            this.clear();
            if (this._planet) {
                this._planet._gmxCheckVersion.update();
            }
        }
    }

    setDateInterval(beginDate, endDate) {
        this._beginDate = beginDate;
        this._endDate = endDate;
        // if (this._gmxProperties && this._gmxProperties.Temporal) {
        // }
    }
};

export { GmxVector };