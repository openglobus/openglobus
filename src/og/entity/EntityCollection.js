/**
 * @module og/entity/EntityCollection
 */

"use strict";

import * as math from "../math.js";
import { BillboardHandler } from "./BillboardHandler.js";
import { Events } from "../Events.js";
import { LabelHandler } from "./LabelHandler.js";
import { PolylineHandler } from "./PolylineHandler.js";
import { RayHandler } from "./RayHandler.js";
import { PointCloudHandler } from "./PointCloudHandler.js";
import { StripHandler } from "./StripHandler.js";
import { ShapeHandler } from "./ShapeHandler.js";
import { GeoObjectHandler } from "./GeoObjectHandler.js";

/**
 * An observable collection of og.Entity instances where each entity has a unique id.
 * Entity collection provide handlers for an each type of entity like billboard, label or 3ds object.
 * @constructor
 * @param {Object} [options] - Entity options:
 * @param {Array.<Entity>} [options.entities] - Entities array.
 * @param {boolean} [options.visibility=true] - Entity visibility.
 * @param {Array.<number>} [options.scaleByDistance] - Entity scale by distance parameters. (exactly 3 entries)
 * First index - near distance to the entity, after entity becomes full scale.
 * Second index - far distance to the entity, when entity becomes zero scale.
 * Third index - far distance to the entity, when entity becomes invisible.
 * @param {number} [options.opacity] - Entity global opacity.
 * @param {boolean} [options.pickingEnabled=true] - Entity picking enable.
 * @param {Number} [options.polygonOffsetFactor=0.0] - The scale factor for the variable depth offset. The default value is 0.
 * @param {Number} [options.polygonOffsetUnits=0.0] - The multiplier by which an implementation-specific value is multiplied with to create a constant depth offset. The default value is 0.
 * @fires og.EntityCollection#entitymove
 * @fires og.EntityCollection#draw
 * @fires og.EntityCollection#drawend
 * @fires og.EntityCollection#add
 * @fires og.EntityCollection#remove
 * @fires og.EntityCollection#entityadd
 * @fires og.EntityCollection#entityremove
 * @fires og.EntityCollection#visibilitychange
 * @fires og.EntityCollection#mousemove
 * @fires og.EntityCollection#mouseenter
 * @fires og.EntityCollection#mouseleave
 * @fires og.EntityCollection#lclick
 * @fires og.EntityCollection#rclick
 * @fires og.EntityCollection#mclick
 * @fires og.EntityCollection#ldblclick
 * @fires og.EntityCollection#rdblclick
 * @fires og.EntityCollection#mdblclick
 * @fires og.EntityCollection#lup
 * @fires og.EntityCollection#rup
 * @fires og.EntityCollection#mup
 * @fires og.EntityCollection#ldown
 * @fires og.EntityCollection#rdown
 * @fires og.EntityCollection#mdown
 * @fires og.EntityCollection#lhold
 * @fires og.EntityCollection#rhold
 * @fires og.EntityCollection#mhold
 * @fires og.EntityCollection#mousewheel
 * @fires og.EntityCollection#touchmove
 * @fires og.EntityCollection#touchstart
 * @fires og.EntityCollection#touchend
 * @fires og.EntityCollection#doubletouch
 * @fires og.EntityCollection#touchleave
 * @fires og.EntityCollection#touchenter
 */
class EntityCollection {
    constructor(options) {
        options = options || {};

        /**
         * Unic identifier.
         * @public
         * @readonly
         */
        this.id = EntityCollection._staticCounter++;

        /**
         * Render node collections array index.
         * @protected
         * @type {number}
         */
        this._renderNodeIndex = -1;

        /**
         * Render node context.
         * @public
         * @type {RenderNode}
         */
        this.renderNode = null;

        /**
         * Visibility option.
         * @protected
         * @type {boolean}
         */
        this._visibility = options.visibility == undefined ? true : options.visibility;

        /**
         * Specifies the scale factor for gl.polygonOffset function to calculate depth values, 0.0 is default.
         * @public
         * @type {Number}
         */
        this.polygonOffsetFactor =
            options.polygonOffsetFactor != undefined ? options.polygonOffsetFactor : 0.0;

        /**
         * Specifies the scale Units for gl.polygonOffset function to calculate depth values, 0.0 is default.
         * @public
         * @type {Number}
         */
        this.polygonOffsetUnits =
            options.polygonOffsetUnits != undefined ? options.polygonOffsetUnits : 0.0;

        /**
         * Billboards handler
         * @public
         * @type {BillboardHandler}
         */
        this.billboardHandler = new BillboardHandler(this);

        /**
         * Labels handler
         * @public
         * @type {LabelHandler}
         */
        this.labelHandler = new LabelHandler(this, options.labelMaxLetters);

        /**
         * Shape handler
         * @public
         * @type {ShapeHandler}
         */
        this.shapeHandler = new ShapeHandler(this);

        /**
         * Polyline handler
         * @public
         * @type {PolylineHandler}
         */
        this.polylineHandler = new PolylineHandler(this);

        /**
         * Ray handler
         * @public
         * @type {RayHandler}
         */
        this.rayHandler = new RayHandler(this);

        /**
         * PointCloud handler
         * @public
         * @type {PointCloudHandler}
         */
        this.pointCloudHandler = new PointCloudHandler(this);

        /**
         * Strip handler
         * @public
         * @type {StripHandler}
         */
        this.stripHandler = new StripHandler(this);

        /**
         * Geo object handler
         * @public
         * @type {og.GeoObjectHandler}
         */
        this.geoObjectHandler = new GeoObjectHandler(this);

        if (options.pickingEnabled != undefined) {
            this.setPickingEnabled(options.pickingEnabled);
        }

        /**
         * Entities array.
         * @protected
         * @type {Array.<Entity>}
         */
        this._entities = [];

        /**
         * First index - near distance to the entity, after entity becomes full scale.
         * Second index - far distance to the entity, when entity becomes zero scale.
         * Third index - far distance to the entity, when entity becomes invisible.
         * @public
         * @type {Array.<number>} - (exactly 3 entries)
         */
        this.scaleByDistance = options.scaleByDistance || [math.MAX32, math.MAX32, math.MAX32];

        this.pickingScale = options.pickingScale || 1.0;

        /**
         * Global opacity.
         * @protected
         * @type {number}
         */
        this._opacity = options.opacity == undefined ? 1.0 : options.opacity;

        /**
         * Opacity state during the animated opacity.
         * @protected
         * @type {number}
         */
        this._fadingOpacity = this._opacity;

        /**
         * Entity collection events handler.
         * @public
         * @type {Events}
         */
        this.events = new Events(EVENT_NAMES, this);

        this.rendererEvents = this.events;

        // initialize current entities
        if (options.entities) {
            this.addEntities(options.entities);
        }
    }

    static get _staticCounter() {
        if (!this._counter && this._counter !== 0) {
            this._counter = 0;
        }
        return this._counter;
    }

    static set _staticCounter(n) {
        this._counter = n;
    }

    setPolygonOffset(factor, units) {
        this.polygonOffsetFactor = factor;
        this.polygonOffsetUnits = units;
    }

    /**
     * Sets collection visibility.
     * @public
     * @param {boolean} visibility - Visibility flag.
     */
    setVisibility(visibility) {
        this._visibility = visibility;
        this._fadingOpacity = this._opacity * (visibility ? 1 : 0);
        this.events.dispatch(this.events.visibilitychange, this);
    }

    /**
     * Returns collection visibility.
     * @public
     * @returns {boolean} -
     */
    getVisibility() {
        return this._visibility;
    }

    /**
     * Sets collection opacity.
     * @public
     * @param {number} opacity - Opacity.
     */
    setOpacity(opacity) {
        this._opacity = opacity;
    }

    /**
     * Sets collection picking ability.
     * @public
     * @param {boolean} enable - Picking enable flag.
     */
    setPickingEnabled(enable) {
        this.billboardHandler.pickingEnabled = enable;
        this.labelHandler.pickingEnabled = enable;
        this.polylineHandler.pickingEnabled = enable;
        this.rayHandler.pickingEnabled = enable;
        this.shapeHandler.pickingEnabled = enable;
        this.pointCloudHandler.pickingEnabled = enable;
        this.stripHandler.pickingEnabled = enable;
        this.geoObjectHandler.pickingEnabled = enable;
    }

    /**
     * Gets collection opacity.
     * @public
     * @returns {number} -
     */
    getOpacity() {
        return this._opacity;
    }

    /**
     * Sets scale by distance parameters.
     * @public
     * @param {number} near - Full scale entity distance.
     * @param {number} far - Zerol scale entity distance.
     * @param {number} [farInvisible] - Entity visibility distance.
     */
    setScaleByDistance(near, far, farInvisible) {
        this.scaleByDistance[0] = near;
        this.scaleByDistance[1] = far;
        this.scaleByDistance[2] = farInvisible || math.MAX32;
    }

    _addRecursively(entity) {
        // billboard
        entity.billboard && this.billboardHandler.add(entity.billboard);

        // label
        entity.label && this.labelHandler.add(entity.label);

        // shape
        entity.shape && this.shapeHandler.add(entity.shape);

        // polyline
        entity.polyline && this.polylineHandler.add(entity.polyline);

        // ray
        entity.ray && this.rayHandler.add(entity.ray);

        // pointCloud
        entity.pointCloud && this.pointCloudHandler.add(entity.pointCloud);

        // strip
        entity.strip && this.stripHandler.add(entity.strip);

        //geoObject
        entity.geoObject && this.geoObjectHandler.add(entity.geoObject);

        this.events.dispatch(this.events.entityadd, entity);

        for (var i = 0; i < entity.childrenNodes.length; i++) {
            entity.childrenNodes[i]._entityCollection = this;
            entity.childrenNodes[i]._entityCollectionIndex = entity._entityCollectionIndex;
            entity.childrenNodes[i]._pickingColor = entity._pickingColor;
            this._addRecursively(entity.childrenNodes[i]);
        }
    }

    /**
     * Adds entity to the collection and returns collection.
     * @public
     * @param {Entity} entity - Entity.
     * @returns {EntityCollection} -
     */
    add(entity) {
        if (!entity._entityCollection) {
            entity._entityCollection = this;
            entity._entityCollectionIndex = this._entities.length;
            this._entities.push(entity);
            var rn = this.renderNode;
            if (rn) {
                rn.renderer && rn.renderer.assignPickingColor(entity);
                if (rn.ellipsoid && entity._cartesian.isZero()) {
                    entity.setCartesian3v(rn.ellipsoid.lonLatToCartesian(entity._lonlat));
                }
            }
            this._addRecursively(entity);
            entity.setPickingColor();
        }
        return this;
    }

    /**
     * Adds entities array to the collection and returns collection.
     * @public
     * @param {Array.<Entity>} entities - Entities array.
     * @returns {EntityCollection} -
     */
    addEntities(entities) {
        for (let i = 0, len = entities.length; i < len; i++) {
            this.add(entities[i]);
        }
        return this;
    }

    /**
     * Returns true if the entity belongs this collection, otherwise returns false.
     * @public
     * @param {Entity} entity - Entity.
     * @returns {boolean} -
     */
    belongs(entity) {
        return (
            entity._entityCollection &&
            this._renderNodeIndex === entity._entityCollection._renderNodeIndex
        );
    }

    _removeRecursively(entity) {
        entity._entityCollection = null;
        entity._entityCollectionIndex = -1;

        // billboard
        entity.billboard && this.billboardHandler.remove(entity.billboard);

        // label
        entity.label && this.labelHandler.remove(entity.label);

        // shape
        entity.shape && this.shapeHandler.remove(entity.shape);

        // polyline
        entity.polyline && this.polylineHandler.remove(entity.polyline);

        // ray
        entity.ray && this.rayHandler.remove(entity.ray);

        // pointCloud
        entity.pointCloud && this.pointCloudHandler.remove(entity.pointCloud);

        // strip
        entity.strip && this.stripHandler.remove(entity.strip);

        // geoObject
        entity.geoObject && this.geoObjectHandler.remove(entity.geoObject);

        for (var i = 0; i < entity.childrenNodes.length; i++) {
            this._removeRecursively(entity.childrenNodes[i]);
        }
    }

    /**
     * Removes entity from this collection.
     * @public
     * @param {Entity} entity - Entity to remove.
     */
    removeEntity(entity) {
        this._entities.splice(entity._entityCollectionIndex, 1);
        this.reindexEntitiesArray(entity._entityCollectionIndex);

        // clear picking color
        if (this.renderNode && this.renderNode.renderer) {
            this.renderNode.renderer.clearPickingColor(entity);
            entity._pickingColor.clear();
        }

        if (this.belongs(entity)) {
            this._removeRecursively(entity);
        }

        this.events.dispatch(this.events.entityremove, entity);
    }

    _removeEntitySilent(entity) {
        this._entities.splice(entity._entityCollectionIndex, 1);
        this.reindexEntitiesArray(entity._entityCollectionIndex);

        // clear picking color
        if (this.renderNode && this.renderNode.renderer) {
            this.renderNode.renderer.clearPickingColor(entity);
            entity._pickingColor.clear();
        }

        if (this.belongs(entity)) {
            this._removeRecursively(entity);
        }
    }

    /**
     * Creates or refresh collected entities picking color.
     * @public
     */
    createPickingColors() {
        var e = this._entities;
        for (var i = 0; i < e.length; i++) {
            if (!e[i].parent) {
                this.renderNode.renderer.assignPickingColor(e[i]);
                e[i].setPickingColor();
            }
        }
    }

    /**
     * Refresh collected entities indexes from startIndex entitytes collection array position.
     * @public
     * @param {number} startIndex - Entities collection array index.
     */
    reindexEntitiesArray(startIndex) {
        var e = this._entities;
        for (var i = startIndex; i < e.length; i++) {
            e[i]._entityCollectionIndex = i;
        }
    }

    /**
     * Adds this collection to render node.
     * @public
     * @param {RenderNode} renderNode - Render node.
     * @param {boolean} [isHidden] - Uses in vector layers that render in planet render specific function.
     * @returns {EntityCollection} -
     */
    addTo(renderNode, isHidden) {
        if (!this.renderNode) {
            this.renderNode = renderNode;
            if (!isHidden) {
                this._renderNodeIndex = renderNode.entityCollections.length;
                renderNode.entityCollections.push(this);
            }
            renderNode.ellipsoid && this._updateGeodeticCoordinates(renderNode.ellipsoid);

            this.bindRenderNode(renderNode);

            this.events.dispatch(this.events.add, this);
        }
        return this;
    }

    /**
     * This function is called in the RenderNode assign function.
     * @param {RenderNode} renderNode
     */
    bindRenderNode(renderNode) {
        if (renderNode.renderer) {
            this.billboardHandler.setRenderer(renderNode.renderer);
            this.labelHandler.setRenderer(renderNode.renderer);
            this.rayHandler.setRenderer(renderNode.renderer);

            this.geoObjectHandler.setRenderNode(renderNode);

            this.shapeHandler.setRenderNode(renderNode);
            this.polylineHandler.setRenderNode(renderNode);
            this.pointCloudHandler.setRenderNode(renderNode);
            this.stripHandler.setRenderNode(renderNode);

            this.updateBillboardsTextureAtlas();
            this.updateLabelsFontAtlas();
            this.createPickingColors();
        }
    }

    /**
     * Updates coordiantes all lonLat entities in collection after collecction attached to the planet node.
     * @private
     * @param {Ellipsoid} ellipsoid - Globe ellipsoid.
     */
    _updateGeodeticCoordinates(ellipsoid) {
        var e = this._entities;
        var i = e.length;
        while (i--) {
            var ei = e[i];
            ei._lonlat && ei.setCartesian3v(ellipsoid.lonLatToCartesian(ei._lonlat));
        }
    }

    /**
     * Updates billboard texture atlas.
     * @public
     */
    updateBillboardsTextureAtlas() {
        var b = this.billboardHandler._billboards;
        for (var i = 0; i < b.length; i++) {
            b[i].setSrc(b[i]._src);
        }
    }

    /**
     * Updates labels font atlas.
     * @public
     */
    updateLabelsFontAtlas() {
        if (this.renderNode) {
            var l = [].concat(this.labelHandler._billboards);
            this.labelHandler._billboards = [];
            for (var i = 0; i < l.length; i++) {
                this.labelHandler.assignFontAtlas(l[i]);
            }
        }
    }

    /**
     * Removes collection from render node.
     * @public
     */
    remove() {
        if (this.renderNode) {
            if (this._renderNodeIndex !== -1) {
                this.renderNode.entityCollections.splice(this._renderNodeIndex, 1);
                // reindex in the renderNode
                for (
                    var i = this._renderNodeIndex;
                    i < this.renderNode.entityCollections.length;
                    i++
                ) {
                    this.renderNode.entityCollections._renderNodeIndex = i;
                }
            }
            this.renderNode = null;
            this._renderNodeIndex = -1;
            this.events.dispatch(this.events.remove, this);
        }
    }

    /**
     * Gets entity array.
     * @public
     * @returns {Array.<Entity>} -
     */
    getEntities() {
        return [].concat(this._entities);
    }

    /**
     * Safety entities loop.
     * @public
     * @param {function} callback - Entity callback.
     */
    each(callback) {
        var i = this._entities.length;
        while (i--) {
            var ei = this._entities[i];
            ei && callback(ei);
        }
    }

    /**
     * Removes all entities from colection and clear handlers.
     * @public
     */
    clear() {
        // TODO: Optimize by replace delete
        // code to the clearEntity function.
        this.billboardHandler.clear();
        this.labelHandler.clear();
        this.shapeHandler.clear();
        this.polylineHandler.clear();
        this.rayHandler.clear();
        this.pointCloudHandler.clear();
        this.stripHandler.clear();
        this.geoObjectHandler.clear();

        var i = this._entities.length;
        while (i--) {
            var ei = this._entities[i];
            if (this.renderNode && this.renderNode.renderer) {
                this.renderNode.renderer.clearPickingColor(ei);
                ei._pickingColor.clear();
            }
            this._clearEntity(ei);
        }
        this._entities.length = 0;
        this._entities = [];
    }

    /**
     * Clears entity recursevely.
     * @private
     * @param {Entity} entity - Entity to clear.
     */
    _clearEntity(entity) {
        entity._entityCollection = null;
        entity._entityCollectionIndex = -1;
        for (var i = 0; i < entity.childrenNodes.length; i++) {
            this._clearEntity(entity.childrenNodes[i]);
        }
    }
}

const EVENT_NAMES = [
    /**
     * Triggered when entity has moved.
     * @event og.EntityCollection#entitymove
     */
    "entitymove",

    /**
     * Triggered when collection entities begin draw.
     * @event og.EntityCollection#draw
     */
    "draw",

    /**
     * Triggered after collection has drawn.
     * @event og.EntityCollection#drawend
     */
    "drawend",

    /**
     * Triggered when added to the render node.
     * @event og.EntityCollection#add
     */
    "add",

    /**
     * Triggered when removed from the render node.
     * @event og.EntityCollection#remove
     */
    "remove",

    /**
     * Triggered when new entity added to the collection.
     * @event og.EntityCollection#entityadd
     */
    "entityadd",

    /**
     * Triggered when entity removes from the collection.
     * @event og.EntityCollection#entityremove
     */
    "entityremove",

    /**
     * Triggered when visibility changes.
     * @event og.EntityCollection#visibilitychange
     */
    "visibilitychange",

    /**
     * Triggered when mouse moves over the entity.
     * @event og.EntityCollection#mousemove
     */
    "mousemove",

    /**
     * Triggered when mouse has entered over the entity.
     * @event og.EntityCollection#mouseenter
     */
    "mouseenter",

    /**
     * Triggered when mouse leaves the entity.
     * @event og.EntityCollection#mouseleave
     */
    "mouseleave",

    /**
     * Mouse left button clicked.
     * @event og.EntityCollection#lclick
     */
    "lclick",

    /**
     * Mouse right button clicked.
     * @event og.EntityCollection#rclick
     */
    "rclick",

    /**
     * Mouse right button clicked.
     * @event og.EntityCollection#mclick
     */
    "mclick",

    /**
     * Mouse left button double click.
     * @event og.EntityCollection#ldblclick
     */
    "ldblclick",

    /**
     * Mouse right button double click.
     * @event og.EntityCollection#rdblclick
     */
    "rdblclick",

    /**
     * Mouse middle button double click.
     * @event og.EntityCollection#mdblclick
     */
    "mdblclick",

    /**
     * Mouse left button up(stop pressing).
     * @event og.EntityCollection#lup
     */
    "lup",

    /**
     * Mouse right button up(stop pressing).
     * @event og.EntityCollection#rup
     */
    "rup",

    /**
     * Mouse middle button up(stop pressing).
     * @event og.EntityCollection#mup
     */
    "mup",

    /**
     * Mouse left button is just pressed down(start pressing).
     * @event og.EntityCollection#ldown
     */
    "ldown",

    /**
     * Mouse right button is just pressed down(start pressing).
     * @event og.EntityCollection#rdown
     */
    "rdown",

    /**
     * Mouse middle button is just pressed down(start pressing).
     * @event og.EntityCollection#mdown
     */
    "mdown",

    /**
     * Mouse left button is pressing.
     * @event og.EntityCollection#lhold
     */
    "lhold",

    /**
     * Mouse right button is pressing.
     * @event og.EntityCollection#rhold
     */
    "rhold",

    /**
     * Mouse middle button is pressing.
     * @event og.EntityCollection#mhold
     */
    "mhold",

    /**
     * Mouse wheel is rotated.
     * @event og.EntityCollection#mousewheel
     */
    "mousewheel",

    /**
     * Triggered when touch moves over the entity.
     * @event og.EntityCollection#touchmove
     */
    "touchmove",

    /**
     * Triggered when entity begins to touch.
     * @event og.EntityCollection#touchstart
     */
    "touchstart",

    /**
     * Triggered when entity ends touching.
     * @event og.EntityCollection#touchend
     */
    "touchend",

    /**
     * Triggered entity double touch.
     * @event og.EntityCollection#doubletouch
     */
    "doubletouch",

    /**
     * Triggered when touching leaves entity.
     * @event og.EntityCollection#touchleave
     */
    "touchleave",

    /**
     * Triggered when touch enters over the entity.
     * @event og.EntityCollection#touchenter
     */
    "touchenter"
];

export { EntityCollection };
