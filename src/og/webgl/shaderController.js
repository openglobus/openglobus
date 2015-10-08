goog.provide('og.webgl.ShaderController');


og.webgl.ShaderController = function (handler, shaderProgram) {
    this._program = shaderProgram;
    this._handler = handler;
    this._activated = false;
};

og.webgl.ShaderController.prototype.getProgram = function () {
    return this._program;
};

og.webgl.ShaderController.prototype.activate = function () {
    if (!this._activated) {
        this._handler.activeShaderProgram.deactivate();
        this._handler.activeShaderProgram = this;
        var p = this._program;
        this._activated = true;
        p.enableAttribArrays();
        p.use();
    }
};

og.webgl.ShaderController.prototype.deactivate = function () {
    this._program.disableAttribArrays();
    this._activated = false;
};

og.webgl.ShaderController.prototype.isActive = function () {
    return this._activated;
};

og.webgl.ShaderController.prototype.set = function (params) {
    this._program.set(params);
};

og.webgl.ShaderController.prototype.drawIndexBuffer = function (mode, buffer) {
    this._program.drawIndexBuffer(mode, buffer);
};

og.webgl.ShaderController.prototype.drawArray = function (mode, numItems) {
    this._program.drawArray(mode, numItems);
};

og.webgl.ShaderController.prototype.initialize = function () {
    this._program.createProgram(this._handler.gl);
};