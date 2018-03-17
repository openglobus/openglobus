/**
 * @module og/scene/RenderNode
 */

'use strict';

import { BaseNode } from './BaseNode.js';
import { Events } from '../Events.js';
import { FontAtlas } from '../utils/FontAtlas.js';
import { TextureAtlas } from '../utils/TextureAtlas.js';

/**
 * Render node is a logical part of a render mechanism. Represents scene rendering.
 * Forexample one scene node for rendering the Earth, another one for rendering the Moon, another node for rendering stars etc.
 * Each render node has own model view space defined with matrices(scale, rotation, translation, transformation).
 * There are collections of ligh sources, entities and so on in the node.
 * Access to the node is renderer.renderNodes["Earth"]
 * @class
 * @extends {og.scene.Node}
 * @param {string} name - Node name.
 */
class RenderNode extends BaseNode {
    constructor(name) {
        super(name);

        /**
         * Renderer that calls frame() callback.
         * @public
         * @type {og.Renderer}
         */
        this.renderer = null;

        this.drawMode = null;

        /** Show rendering.
         * @public
         */
        this.show = true;

        this._isActive = true;

        /**
         * Lighting calculations.
         * @public
         * @type {boolean}
         */
        this.lightEnabled = false;

        /**
         * Point light array.
         * @private
         * @type {Array.<og.LightSource>}
         */
        this._lights = [];
        this._lightsTransformedPositions = [];
        this._lightsParamsv = [];
        this._lightsParamsf = [];
        this._lightsNames = [];

        /**
         * Entity collection array.
         * @public
         * @type {Array.<og.EntityCollection>}
         */
        this.entityCollections = [];

        /**
         * Texture atlas for the billboards images. One atlas per node.
         * @protected
         * @type {og.utils.TextureAtlas}
         */
        this.billboardsTextureAtlas = new TextureAtlas();

        /**
         * Texture font atlas for the font families and styles. One atlas per node.
         * @public
         * @type {og.utils.FontAtlas}
         */
        this.fontAtlas = new FontAtlas();

        this.events = new Events(null, this);
    }

    /**
     * Assign render node with renderer.
     * @public
     * @param {og.Renderer} renderer - Redner node's renderer.
     */
    assignRenderer(renderer) {
        this.renderer = renderer;
        this.billboardsTextureAtlas.assignHandler(renderer.handler);
        this.fontAtlas.assignHandler(renderer.handler);
        renderer.addPickingCallback(this, this._entityCollectionPickingCallback);

        for (var i = 0; i < this.entityCollections.length; i++) {
            this.entityCollections[i].setRenderer(renderer);
        }

        this.initialization && this.initialization();
    }

    /**
     * Adds entity collection.
     * @public
     * @param {og.EntityCollection} entityCollection - Entity collection.
     * @param {boolean} [isHidden] - If it's true that this collection has specific rendering.
     * @returns {og.scene.RenderNode}
     */
    addEntityCollection(entityCollection, isHidden) {
        entityCollection.addTo(this, isHidden);
        return this;
    }

    /**
     * Removes entity collection.
     * @public
     * @param {og.EntityCollection} entityCollection - Entity collection for remove.
     */
    removeEntityCollection(entityCollection) {
        entityCollection.remove();
    }

    /**
     * Adds point light source.
     * @public
     * @param {og.LightSource} light - Light source.
     * @returns {og.scene.RenderNode}
     */
    addLight(light) {
        light.addTo(this);
        return this;
    }

    /**
     * Gets light object by its name.
     * @public
     * @param {string} name - Point light name.
     * @returns {og.LightSource}
     */
    getLightByName(name) {
        var li = this._lightsNames.indexOf(name);
        return this._lights[li];
    }

    /**
     * Removes light source.
     * @public
     * @param {og.LightSource} light - Light source object.
     */
    removeLight(light) {
        light.remove();
    }

    /**
     * Calls render frame node's callback. Used in renderer.
     * @public
     */
    drawNode() {
        this._isActive && this._drawNodes();
    }

    /**
     * Gets render node activity.
     * @public
     * @returns {boolean}
     */
    isActive() {
        return this._isActive;
    }

    /**
     * Rendering activation.
     * @public
     * @param {boolean} isActive - Activation flag.
     */
    setActive(isActive) {
        this._isActive = isActive;
        for (var i = 0; i < this.childNodes.length; i++) {
            this.childNodes[i].setActive(isActive);
        }
    }

    /**
     * @public
     */
    setDrawMode(mode) {
        this.drawMode = mode;
        for (var i = 0; i < this.childNodes.length; i++) {
            this.childNodes[i].setDrawMode(mode);
        }
    }

    /**
     * IMPORTANT: This function have to be called manualy in each render node frame callback, before drawing scene geometry.
     * @public
     */
    transformLights() {
        var r = this.renderer;
        for (var i = 0; i < this._lights.length; i++) {
            var ii = i * 4;
            var tp;
            if (this._lights[i].directional) {
                tp = r.activeCamera._normalMatrix.mulVec(this._lights[i]._position);
                this._lightsTransformedPositions[ii + 3] = 0;
            } else {
                tp = r.activeCamera._viewMatrix.mulVec3(this._lights[i]._position);
                this._lightsTransformedPositions[ii + 3] = 1;
            }
            this._lightsTransformedPositions[ii] = tp.x;
            this._lightsTransformedPositions[ii + 1] = tp.y;
            this._lightsTransformedPositions[ii + 2] = tp.z;
        }
    }

    updateBillboardsTexCoords() {
        for (var i = 0; i < this.entityCollections.length; i++) {
            this.entityCollections[i].billboardHandler.refreshTexCoordsArr();
        }
    }

    /**
     * @private
     */
    _drawNodes() {
        for (var i = 0; i < this.childNodes.length; i++) {
            if (this.childNodes[i]._isActive)
                this.childNodes[i]._drawNodes();
        }

        if (this.show) {
            if (this.frame) {
                //this.lightEnabled && this.transformLights();
                this.frame();
            }
            this.drawEntityCollections(this.entityCollections);
        }
    }

    /**
     * @public
     */
    drawEntityCollections(ec) {
        if (ec.length) {
            var gl = this.renderer.handler.gl;

            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
            gl.disable(gl.CULL_FACE);

            //Z-buffer offset
            gl.enable(gl.POLYGON_OFFSET_FILL);
            gl.polygonOffset(0, -637000);

            //billboards pass
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.billboardsTextureAtlas.texture);

            var i = ec.length;
            while (i--) {
                var eci = ec[i];
                if (eci._animatedOpacity) {
                    //first begin draw event
                    eci.events.dispatch(eci.events.draw, eci);
                    eci.billboardHandler.draw();
                }
            }

            //labels pass
            var fa = this.fontAtlas.atlasesArr;
            for (i = 0; i < fa.length; i++) {
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, fa[i].texture);
            }

            i = ec.length;
            while (i--) {
                ec[i]._animatedOpacity && ec[i].labelHandler.draw();
            }

            //polyline pass
            i = ec.length;
            while (i--) {
                ec[i]._animatedOpacity && ec[i].polylineHandler.draw();
            }

            //Z-buffer offset
            gl.polygonOffset(0, 0);

            gl.disable(gl.POLYGON_OFFSET_FILL);
            gl.enable(gl.CULL_FACE);

            //shapes pass
            i = ec.length;
            while (i--) {
                var eci = ec[i];
                if (eci._animatedOpacity) {
                    eci.shapeHandler.draw();
                    //post draw event
                    eci.events.dispatch(eci.events.drawend, eci);
                }
            }

            //pointClouds pass
            i = ec.length;
            while (i--) {
                ec[i]._animatedOpacity && ec[i].pointCloudHandler.draw();
            }

        }
    }

    /**
     * @public
     */
    drawPickingEntityCollections(ec) {
        if (ec.length) {

            var gl = this.renderer.handler.gl;

            gl.disable(gl.CULL_FACE);

            //Z-buffer offset
            gl.enable(gl.POLYGON_OFFSET_FILL);
            gl.polygonOffset(0, -637000);

            //billoard pass
            var i = ec.length;
            while (i--) {
                ec[i]._visibility && ec[i].billboardHandler.drawPicking();
            }

            //label pass
            i = ec.length;
            while (i--) {
                ec[i]._visibility && ec[i].labelHandler.drawPicking();
            }

            gl.polygonOffset(0, 0);

            gl.disable(gl.POLYGON_OFFSET_FILL);
            gl.enable(gl.CULL_FACE);

            ////polylines pass
            //i = ec.length;
            //while (i--) {
            //    ec[i]._visibility && ec[i].polylineHandler.drawPicking();
            //}

            ////shapes pass
            //i = ec.length;
            //while (i--) {
            //    ec[i]._visibility && ec[i].shapeHandler.drawPicking();
            //}

            ////pointClouds pass
            //i = ec.length;
            //while (i--) {
            //    ec[i]._visibility && ec[i].pointCloudHandler.drawPicking();
            //}
        }
    }

    /**
     * Picking entity frame callback
     * @private
     */
    _entityCollectionPickingCallback() {
        this.drawPickingEntityCollections(this.entityCollections);
    }
};

export { RenderNode };