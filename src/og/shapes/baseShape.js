goog.provide('og.shape.BaseShape');

goog.require('og.math.Vector3');
goog.require('og.math.Quaternion');
goog.require('og.math.Matrix4');

og.shape.BaseShape = function (options) {

    options = options || {};

    this.id = og.shape.BaseShape.__staticId++;

    this.position = options.position || new og.math.Vector3();
    this.orientation = options.orientation || new og.math.Quaternion(0.0, 0.0, 0.0, 1.0);
    this.scale = options.scale || new og.math.Vector3(1.0, 1.0, 1.0);
    this.color = options.color || [1.0, 1.0, 1.0, 1.0];
    this.visibility = (options.visibility != undefined ? options.visibility : true);

    this._positionBuffer = null;
    this._normalBuffer = null;
    this._indexBuffer = null;
    this._textureCoordBuffer = null;

    this._positionData = [];
    this._normalData = [];
    this._indexData = [];
    this._textureCoordData = [];

    this._mxScale = new og.math.Matrix4().setIdentity();
    this._mxTranslation = new og.math.Matrix4().setIdentity();
    this._mxTRS = new og.math.Matrix4().setIdentity();

    this.texture = null;

    this._renderNode = null;

    /**
     * Entity instance that holds this shape.
     * @private
     * @type {og.Entity}
     */
    this._entity = null;

    /**
     * Handler that stores and renders this shape object.
     * @private
     * @type {og.BillboardHandler}
     */
    this._handler = null;
    this._handlerIndex = -1;
};

og.shape.BaseShape.__staticId = 0;

og.shape.BaseShape.prototype.clear = function () {

    this.position.set(0.0, 0.0, 0.0);
    this.orientation.set(0.0, 0.0, 0.0, 1.0);
    this.scale.set(1.0, 1.0, 1.0);

    this._positionData.length = 0;
    this._normalData.length = 0;
    this._indexData.length = 0;

    this._mxScale.setIdentity();
    this._mxTranslation.setIdentity();
    this._mxTRS.setIdentity();

    this._deleteBuffers();
};

og.shape.BaseShape.prototype._deleteBuffers = function () {
    var r = this._renderNode.renderer,
        gl = r.handler.gl;

    gl.deleteBuffer(this._positionBuffer);
    gl.deleteBuffer(this._normalBuffer);
    gl.deleteBuffer(this._indexBuffer);

    this._positionBuffer = null;
    this._normalBuffer = null;
    this._indexBuffer = null;
};

og.shape.BaseShape.prototype.setVisibility = function (visibility) {
    this.visibility = visibility;
};

og.shape.BaseShape.prototype.getVisibility = function () {
    return this.visibility;
};

og.shape.BaseShape.prototype.setRenderNode = function (renderNode) {
    this._renderNode = renderNode;
    this._createBuffers();
};

og.shape.BaseShape.prototype.setPosition3v = function (position) {
    this.position.copy(position);
    this._mxTranslation.translateToPosition(position);
};

og.shape.BaseShape.prototype.translate3v = function (vec) {
    this.position.addA(vec);
    this._mxTranslation.translate(vec);
};

og.shape.BaseShape.prototype.setScale3v = function (scale) {
    this.scale.copy(scale);
    this._mxScale.scale(scale);
};

og.shape.BaseShape.prototype.remove = function () {
    this._entity = null;
    this._handler && this._handler.remove(this);
};

og.shape.BaseShape.prototype.setPickingColor3v = function (color) {
    this._handler && this._handler.setPickingColorArr(this._handlerIndex, color);
};

og.shape.BaseShape.prototype._createBuffers = function () {
    this._deleteBuffers();
    var r = this._renderNode.renderer;
    this._positionBuffer = r.handler.createArrayBuffer(new Float32Array(this._positionData), 3, this._positionData.length / 3);
    this._normalBuffer = r.handler.createArrayBuffer(new Float32Array(this._normalData), 3, this._normalData.length / 3);
    this._indexBuffer = r.handler.createElementArrayBuffer(new Uint16Array(this._indexData), 1, this._indexData.length);
    this._textureCoordBuffer = r.handler.createArrayBuffer(new Float32Array(this._textureCoordData), 2, this._textureCoordData.length / 2);
}

og.shape.BaseShape.prototype.refresh = function () {
    this._mxTRS = this._mxTranslation.mul(this.orientation.getMatrix4().mul(this._mxScale));
};

og.shape.BaseShape.prototype.draw = function () {
    if (this.visibility) {
        var rn = this._renderNode;
        var r = rn.renderer;

        var sh, p,
            gl = r.handler.gl;

        if (rn.lightEnabled) {
            sh = r.handler.shaderPrograms.shape_wl;
            p = sh._program;
            sha = p.attributes,
            shu = p.uniforms;

            sh.activate();

            gl.uniform4fv(shu.uColor._pName, this.color);
            gl.uniform3fv(shu.pointLightsPositions._pName, rn._pointLightsTransformedPositions);
            gl.uniform3fv(shu.pointLightsParamsv._pName, rn._pointLightsParamsv);
            gl.uniform1fv(shu.pointLightsParamsf._pName, rn._pointLightsParamsf);
            gl.uniformMatrix4fv(shu.uPMatrix._pName, false, r.activeCamera._pMatrix._m);
            gl.uniformMatrix4fv(shu.uMVMatrix._pName, false, r.activeCamera._mvMatrix._m);
            gl.uniformMatrix3fv(shu.uNMatrix._pName, false, r.activeCamera._nMatrix._m);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._normalBuffer);
            gl.vertexAttribPointer(sha.aVertexNormal._pName, this._normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
        } else {
            sh = r.handler.shaderPrograms.shape_nl;
            p = sh._program;
            sha = p.attributes,
            shu = p.uniforms;

            sh.activate();

            gl.uniform4fv(shu.uColor._pName, this.color);
            gl.uniformMatrix4fv(shu.uPMVMatrix._pName, false, r.activeCamera._pmvMatrix._m);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
        gl.vertexAttribPointer(sha.aVertexPosition._pName, this._positionBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.uniformMatrix4fv(shu.uTRSMatrix._pName, false, this._mxTRS._m);

        //if (this.texture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(shu.uSampler._pName, 0);
        //}

        gl.bindBuffer(gl.ARRAY_BUFFER, this._textureCoordBuffer);
        gl.vertexAttribPointer(sha.aTextureCoord._pName, this._textureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
        gl.drawElements(r.handler.gl.TRIANGLES, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
};