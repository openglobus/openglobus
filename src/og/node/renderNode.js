goog.provide('og.node.RenderNode');

goog.require('og.inheritance');
goog.require('og.node.Node');
goog.require('og.webgl');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');
goog.require('og.utils.TextureAtlas');
goog.require('og.utils.FontAtlas');

og.node.RenderNode = function (name) {
    og.inheritance.base(this, name);
    this.renderer = null;
    this.drawMode = null;
    this.show = true;
    this._isActive = true;
    this._zIndex = 1000;

    this.scaleMatrix = new og.math.Matrix4().setIdentity();
    this.rotationMatrix = new og.math.Matrix4().setIdentity();
    this.translationMatrix = new og.math.Matrix4().setIdentity();
    this.transformationMatrix = new og.math.Matrix4().setIdentity();
    this.itransformationMatrix = new og.math.Matrix4().setIdentity();

    this.lightEnabled = false;
    this._pointLights = [];
    this._pointLightsTransformedPositions = [];
    this._pointLightsParamsv = [];
    this._pointLightsParamsf = [];
    this._pointLightsNames = [];

    this.entityCollections = [];
    this.billboardsTextureAtlas = new og.utils.TextureAtlas();
    this.fontAtlas = new og.utils.FontAtlas();
};

og.inheritance.extend(og.node.RenderNode, og.node.Node);

og.node.RenderNode.prototype.addEntityCollection = function (entityCollection) {
    entityCollection.addTo(this);
    return this;
};

og.node.RenderNode.prototype.removeEntityCollection = function (entityCollection) {
    entityCollection.remove();
};

og.node.RenderNode.prototype.addLight = function (light) {
    light.addTo(this);
    return this;
};

og.node.RenderNode.prototype.getLightByName = function (name) {
    var li = this._pointLightsNames.indexOf(name);
    return this._pointLights[li];
};

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

og.node.RenderNode.prototype.setZIndex = function (zindex) {
    this._zIndex = zindex;
};

og.node.RenderNode.prototype.getZIndex = function () {
    return this._zIndex;
};

og.node.RenderNode.prototype.isActive = function () {
    return this._isActive;
};

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
            ec[i]._billboardHandler.drawPicking();
        }

        i = ec.length;
        while (i--) {
            ec[i]._labelHandler.drawPicking();
        }

        gl.enable(gl.CULL_FACE);
    }
};