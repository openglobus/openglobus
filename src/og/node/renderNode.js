goog.provide('og.node.RenderNode');

goog.require('og.Events');
goog.require('og.inheritance');
goog.require('og.node.Node');
goog.require('og.webgl');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');
goog.require('og.utils.TextureAtlas');
goog.require('og.utils.FontAtlas');

/**
 * Render node is a logical part of a render mechanism. Represents scene rendering.
 * Forexample one node for rendering the Earth, another one for rendering the Moon, another node for rendering stars etc.
 * Each render node has own model view space defined with matrices(scale, rotation, translation, transformation).
 * There are collections of ligh sources, entities and so on in the node.
 * Access to the node is renderer.renderNodes["Earth"]
 * @class
 * @extends {og.node.Node}
 * @param {string} name - Node name.
 */
og.node.RenderNode = function (name) {

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

    //Actually this matrices are not important, but could 
    //be useful for big objects like Planet.     
    this.scaleMatrix = new og.math.Matrix4().setIdentity();
    this.rotationMatrix = new og.math.Matrix4().setIdentity();
    this.translationMatrix = new og.math.Matrix4().setIdentity();
    this.transformationMatrix = new og.math.Matrix4().setIdentity();
    this.itransformationMatrix = new og.math.Matrix4().setIdentity();

    /**
     * Lighting calculations.
     * @public
     * @type {boolean}
     */
    this.lightEnabled = false;

    /**
     * Point light array.
     * @private
     * @type {Array.<og.light.PointLight>}
     */
    this._pointLights = [];
    this._pointLightsTransformedPositions = [];
    this._pointLightsParamsv = [];
    this._pointLightsParamsf = [];
    this._pointLightsNames = [];

    /**
     * Entity collection array.
     * @public
     * @type {Array.<og.EntityCollection>}
     */
    this.entityCollections = [];

    /**
     * Texture atlas for the billboards images. One atlas per node.
     * @public
     * @type {og.utils.TextureAtlas}
     */
    this.billboardsTextureAtlas = new og.utils.TextureAtlas();

    /**
     * Texture font atlas for the font families and styles. One atlas per node.
     * @public
     * @type {og.utils.FontAtlas}
     */
    this.fontAtlas = new og.utils.FontAtlas();

    //TODO
    this.events = new og.Events();
};

og.inheritance.extend(og.node.RenderNode, og.node.Node);

/**
 * Adds entity collection.
 * @public
 * @param {og.EntityCollection} entityCollection - Entity collection.
 * @returns {og.node.RenderNode}
 */
og.node.RenderNode.prototype.addEntityCollection = function (entityCollection) {
    entityCollection.addTo(this);
    return this;
};

/**
 * Removes entity collection.
 * @public
 * @param {og.EntityCollection} entityCollection - Entity collection for remove.
 */
og.node.RenderNode.prototype.removeEntityCollection = function (entityCollection) {
    entityCollection.remove();
};

/**
 * Adds point light source.
 * @public
 * @param {og.light.PointLight} light - Point light source.
 * @returns {og.node.RenderNode}
 */
og.node.RenderNode.prototype.addLight = function (light) {
    light.addTo(this);
    return this;
};

/**
 * Gets light object by its name.
 * @public
 * @param {string} name - Point light name.
 * @returns {og.light.PointLight}
 */
og.node.RenderNode.prototype.getLightByName = function (name) {
    var li = this._pointLightsNames.indexOf(name);
    return this._pointLights[li];
};

/**
 * Removes light source.
 * @public
 * @param {og.light.PointLight} light - Point light object.
 */
og.node.RenderNode.prototype.removeLight = function (light) {
    light.remove();
};

og.node.RenderNode.prototype.setScale = function (xyz) {
    this.scaleMatrix.scale(xyz);
    return this;
};

og.node.RenderNode.prototype.setOrigin = function (origin) {
    this.translationMatrix.translate(origin);
    return this;
};

og.node.RenderNode.prototype.setAngles = function (ax, ay, az) {
    this.rotationMatrix.eulerToMatrix(ax, ay, az);
    return this;
};

og.node.RenderNode.prototype.updateMatrices = function () {
    this.transformationMatrix = this.translationMatrix.mul(this.rotationMatrix).mul(this.scaleMatrix);
    this.itransformationMatrix = this.transformationMatrix.inverse();
};

og.node.RenderNode.prototype.drawNode = function () {
    if (this._isActive) {
        this.drawNodes();
    }
};

og.node.RenderNode.prototype.isActive = function () {
    return this._isActive;
};

/**
 * Activate rendering this node.
 * @public
 * @param {boolean} isActive - Activation flag.
 */
og.node.RenderNode.prototype.setActive = function (isActive) {
    this._isActive = isActive;
    for (var i = 0; i < this.childNodes.length; i++) {
        this.childNodes[i].setActive(isActive);
    }
};

og.node.RenderNode.prototype.setDrawMode = function (mode) {
    this.drawMode = mode;
    for (var i = 0; i < this.childNodes.length; i++) {
        this.childNodes[i].setDrawMode(mode);
    }
};

og.node.RenderNode.prototype.drawNodes = function () {
    for (var i = 0; i < this.childNodes.length; i++) {
        if (this.childNodes[i]._isActive)
            this.childNodes[i].drawNodes();
    }

    if (this.show) {
        this.drawEntities();
        if (this.frame) {
            //if (this.lightEnabled) {
            //    this.transformLights();
            //}
            this.frame();
        }
    }
};

/**
 * This function have to be called manualy in each render node frame callback, before drawing scene geometry.
 * @public
 */
og.node.RenderNode.prototype.transformLights = function () {
    var r = this.renderer;
    for (var i = 0; i < this._pointLights.length; i++) {
        var ii = i * 3;
        var tp = r.activeCamera.mvMatrix.mulVec3(this._pointLights[i]._position);
        this._pointLightsTransformedPositions[ii] = tp.x;
        this._pointLightsTransformedPositions[ii + 1] = tp.y;
        this._pointLightsTransformedPositions[ii + 2] = tp.z;
    }
};

og.node.RenderNode.prototype.updateBillboardsTexCoords = function () {
    for (var i = 0; i < this.entityCollections.length; i++) {
        this.entityCollections[i]._billboardHandler.refreshTexCoordsArr();
    }
};

og.node.RenderNode.prototype.drawEntities = function () {

    var ec = this.entityCollections;

    if (ec.length) {
        var gl = this.renderer.handler.gl;

        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
        gl.disable(gl.CULL_FACE);

        var i = 0;

        //billboards pass
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.billboardsTextureAtlas.texture);

        i = ec.length;
        while (i--) {
            ec[i]._billboardHandler.draw();
        }

        //labels path
        var fa = this.fontAtlas.atlasesArr;
        for (i = 0; i < fa.length; i++) {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, fa[i].texture);
        }

        i = ec.length;
        while (i--) {
            ec[i]._labelHandler.draw();
        }

        gl.enable(gl.CULL_FACE);
    }
};

/**
 * Assign render node with renderer.
 * @public
 * @param {og.Renderer} renderer - Redner node's renderer.
 */
og.node.RenderNode.prototype.assignRenderer = function (renderer) {
    this.renderer = renderer;
    this.billboardsTextureAtlas.assignHandler(renderer.handler);
    this.fontAtlas.assignHandler(renderer.handler);
    renderer.addPickingCallback(this, this._entityCollectionPickingCallback);

    for (var i = 0; i < this.entityCollections.length; i++) {
        this.entityCollections[i].setRenderer(renderer);
    }
};

og.node.RenderNode.prototype._entityCollectionPickingCallback = function () {
    var ec = this.entityCollections;

    if (ec.length) {
        var gl = this.renderer.handler.gl;

        gl.disable(gl.CULL_FACE);

        var i = 0;

        i = ec.length;
        while (i--) {
            ec[i].billboardPickingEnabled && ec[i]._billboardHandler.drawPicking();
        }

        i = ec.length;
        while (i--) {
            ec[i].labelPickingEnabled && ec[i]._labelHandler.drawPicking();
        }

        gl.enable(gl.CULL_FACE);
    }
};