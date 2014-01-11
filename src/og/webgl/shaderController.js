goog.provide('og.webgl.ShaderController');


og.webgl.ShaderController = function (handler, shaderProgram) {
    this.program = shaderProgram;
    this.handler = handler;
    this._activated = false;
};

og.webgl.ShaderController.prototype.activate = function () {
    if (!this._activated) {
        this.handler.activeShaderProgram.deactivate();
        this.handler.activeShaderProgram = this;
        var p = this.program;
        this._activated = true;
        p.enableAttribArrays();
        p.use();
    }
};

og.webgl.ShaderController.prototype.deactivate = function () {
    this.program.disableAttribArrays();
    this._activated = false;
};

og.webgl.ShaderController.prototype.isActive = function () {
    return this._activated;
};

og.webgl.ShaderController.prototype.set = function (params) {
    this.program.set(params);
};

og.webgl.ShaderController.prototype.drawIndexBuffer = function (mode, buffer) {
    this.program.drawIndexBuffer(mode, buffer);
};

og.webgl.ShaderController.prototype.drawArray = function (mode, numItems) {
    this.program.drawArray(mode, numItems);
};

og.webgl.ShaderController.prototype.initialize = function () {
    this.program.createProgram(this.handler.gl);
};