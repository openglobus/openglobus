og.Renderer = function (glcontext) {
    this.ctx = glcontext;
    this.renderNodes = [];
    this.cameras = [];
    this.activeCamera;

    this.input = new og.input.Input();
    this.controls = [];

    this.mouseDown = false;
    this.mouseIsMoving = false;
    this.mouseX;
    this.mouseY;
    this.mouseLatLonClicked = [];
    this.mouseLatLonPosition = [];
};

og.Renderer.prototype.addControl = function (control) {
    control.setRenderer(this);
    this.controls.push(control);
};

og.Renderer.prototype.addControls = function (cArr) {
    for (var i = 0; i < cArr.length; i++) {
        cArr[i].setRenderer(this);
        this.controls.push(cArr[i]);
    }
};

og.Renderer.prototype.init = function () {
    var that = this;
    this.ctx.drawback = function () {
        that.draw();
    }

    this.input.setEvent("oncharkeypressed", this, null, this.toogleClearPlanet, og.input.KEY_C);

    var camera = new og.Camera();
    camera.init(this, { eye: new og.math.Vector3(0, 0, 12000), look: new og.math.Vector3(0, 0, 0), up: new og.math.Vector3(0, 1, 0) });
    this.activeCamera = camera;

    this.ctx.onCanvasResize = function () {
        that.activeCamera.refresh();
    }
};

og.Renderer.prototype.toogleClearPlanet = function (e) {
    this.renderNodes[0].quadTree.clearTree();
};

og.Renderer.prototype.addRenderNode = function (renderNode) {
    renderNode.assignRenderer(this);
    renderNode.initialization();
    this.renderNodes.push(renderNode);
};

og.Renderer.prototype.draw = function (delta) {

    this.input.handleEvents();

    for (var cnt in this.controls) {
        this.controls[cnt].everyFrame();
    }

    this.activeCamera.apply();

    for (var i = 0; i < this.renderNodes.length; i++) {
        this.renderNodes[i].drawNode();
    }
};

og.Renderer.prototype.Start = function () {
    this.ctx.Start();
}