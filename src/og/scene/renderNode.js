goog.provide('og.scene.RenderNode');

goog.require('og.Events');
goog.require('og.inheritance');
goog.require('og.scene.Node');
goog.require('og.webgl');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');
goog.require('og.utils.TextureAtlas');
goog.require('og.utils.FontAtlas');

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
og.scene.RenderNode = function (name) {

    og.inheritance.base(this, name);

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
    this.billboardsTextureAtlas = new og.utils.TextureAtlas();

    /**
     * Texture font atlas for the font families and styles. One atlas per node.
     * @public
     * @type {og.utils.FontAtlas}
     */
    this.fontAtlas = new og.utils.FontAtlas();

    /**
     * Render node events.
     * @public
     * @type {og.Events}
     */
    this.events = new og.Events();
};

og.inheritance.extend(og.scene.RenderNode, og.scene.Node);

/**
 * Assign render node with renderer.
 * @public
 * @param {og.Renderer} renderer - Redner node's renderer.
 */
og.scene.RenderNode.prototype.assignRenderer = function (renderer) {
    this.renderer = renderer;
    this.billboardsTextureAtlas.assignHandler(renderer.handler);
    this.fontAtlas.assignHandler(renderer.handler);
    renderer.addPickingCallback(this, this._entityCollectionPickingCallback);

    for (var i = 0; i < this.entityCollections.length; i++) {
        this.entityCollections[i].setRenderer(renderer);
    }

    this.initialization && this.initialization();
};

/**
 * Adds entity collection.
 * @public
 * @param {og.EntityCollection} entityCollection - Entity collection.
 * @param {boolean} [isHidden] - If it's true that this collection has specific rendering.
 * @returns {og.scene.RenderNode}
 */
og.scene.RenderNode.prototype.addEntityCollection = function (entityCollection, isHidden) {
    entityCollection.addTo(this, isHidden);
    return this;
};

/**
 * Removes entity collection.
 * @public
 * @param {og.EntityCollection} entityCollection - Entity collection for remove.
 */
og.scene.RenderNode.prototype.removeEntityCollection = function (entityCollection) {
    entityCollection.remove();
};

/**
 * Adds point light source.
 * @public
 * @param {og.LightSource} light - Light source.
 * @returns {og.scene.RenderNode}
 */
og.scene.RenderNode.prototype.addLight = function (light) {
    light.addTo(this);
    return this;
};

/**
 * Gets light object by its name.
 * @public
 * @param {string} name - Point light name.
 * @returns {og.LightSource}
 */
og.scene.RenderNode.prototype.getLightByName = function (name) {
    var li = this._lightsNames.indexOf(name);
    return this._lights[li];
};

/**
 * Removes light source.
 * @public
 * @param {og.LightSource} light - Light source object.
 */
og.scene.RenderNode.prototype.removeLight = function (light) {
    light.remove();
};

/**
 * Calls render frame node's callback. Used in renderer.
 * @public
 */
og.scene.RenderNode.prototype.drawNode = function () {
    this._isActive && this._drawNodes();
};

/**
 * Gets render node activity.
 * @public
 * @returns {boolean}
 */
og.scene.RenderNode.prototype.isActive = function () {
    return this._isActive;
};

/**
 * Activate rendering this node.
 * @public
 * @param {boolean} isActive - Activation flag.
 */
og.scene.RenderNode.prototype.setActive = function (isActive) {
    this._isActive = isActive;
    for (var i = 0; i < this.childNodes.length; i++) {
        this.childNodes[i].setActive(isActive);
    }
};

/**
 * @public
 */
og.scene.RenderNode.prototype.setDrawMode = function (mode) {
    this.drawMode = mode;
    for (var i = 0; i < this.childNodes.length; i++) {
        this.childNodes[i].setDrawMode(mode);
    }
};

/**
 * This function have to be called manualy in each render node frame callback, before drawing scene geometry.
 * @public
 */
og.scene.RenderNode.prototype.transformLights = function () {
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
};

og.scene.RenderNode.prototype.updateBillboardsTexCoords = function () {
    for (var i = 0; i < this.entityCollections.length; i++) {
        this.entityCollections[i].billboardHandler.refreshTexCoordsArr();
    }
};

/**
 * @private
 */
og.scene.RenderNode.prototype._drawNodes = function () {
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
};

/**
 * @public
 */
og.scene.RenderNode.prototype.drawEntityCollections = function (ec) {
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

        //Z-buffer offset
        gl.polygonOffset(0, 0);

        //lineStrings pass
        i = ec.length;
        while (i--) {
            ec[i]._animatedOpacity && ec[i].lineStringHandler.draw();
        }

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
};

/**
 * @public
 */
og.scene.RenderNode.prototype.drawPickingEntityCollections = function (ec) {
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

        ////lineStrings pass
        //i = ec.length;
        //while (i--) {
        //    ec[i]._visibility && ec[i].lineStringHandler.drawPicking();
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
};

/**
 * Picking entity frame callback
 * @private
 */
og.scene.RenderNode.prototype._entityCollectionPickingCallback = function () {
    this.drawPickingEntityCollections(this.entityCollections);
};