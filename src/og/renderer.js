goog.provide('og.Renderer');

goog.require('og.math.Vector3');
goog.require('og.input');
goog.require('og.input.Input');
goog.require('og.Camera');

og.Renderer = function (glcontext) {
    this.ctx = glcontext;
    this.renderNodes = [];
    this.cameras = [];
    this.activeCamera;

    this.input = new og.input.Input();
    this.controls = [];

    this.mouseLeftButtonDown = false;
    this.mouseRightButtonDown = false;
    this.holdMouseLeftButtonDown = false;
    this.holdMouseRightButtonDown = false;
    this.mouseIsMoving = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDirection = new og.math.Vector3();
    this.mousePositionOnEarth = new og.math.Vector3();
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

    this.initMouseHandler();
};

og.Renderer.prototype.initMouseHandler = function () {
    this.input.setEvent("onmouseup", this, canvas, this.onMouseUp);
    this.input.setEvent("onmousemove", this, canvas, this.onMouseMove);
    this.input.setEvent("onmousedown", this, canvas, this.onMouseDown);
};

og.Renderer.prototype.onMouseMove = function (event) {
    this.mouseIsMoving = true;
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
};

og.Renderer.prototype.onMouseDown = function (event) {
    if (event.button === og.input.MB_LEFT) {
        this.mouseLeftButtonDown = true;
    } else {
        this.mouseRightButtonDown = true;
    }
};

og.Renderer.prototype.onMouseUp = function (event) {
    if (event.button === og.input.MB_LEFT) {
        this.mouseLeftButtonDown = false;
        this.holdMouseLeftButtonDown = false;
    } else {
        this.mouseRightButtonDown = false;
        this.holdMouseRightButtonDown = false;
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

    this.mouseDirection = this.activeCamera.unproject(this.mouseX, this.mouseY);
    this.mousePositionOnEarth = this.renderNodes[0].getRayEllipsoidIntersection(this.activeCamera.eye, this.mouseDirection);

    this.handleControls();

    this.activeCamera.apply();

    for (var i = 0; i < this.renderNodes.length; i++) {
        this.renderNodes[i].drawNode();
    }
};

og.Renderer.prototype.handleControls = function () {
    for (var cnt in this.controls) {
        if (this.mouseIsMoving) {
            var sending = { x: this.mouseX, y: this.mouseY, xyz: this.mousePositionOnEarth, direction: this.mouseDirection };
            if (this.controls[cnt].onMouseMoving)
                this.controls[cnt].onMouseMoving(this, sending);
        }

        if (this.mouseLeftButtonDown) {
            var sending = { x: this.mouseX, y: this.mouseY, xyz: this.mousePositionOnEarth, direction: this.mouseDirection };
            if (!this.holdMouseLeftButtonDown) {
                this.holdMouseLeftButtonDown = true;
                if (this.controls[cnt].onMouseLeftButtonClick)
                    this.controls[cnt].onMouseLeftButtonClick(this, sending);
            }

            if (this.controls[cnt].onMouseLeftButtonDown)
                this.controls[cnt].onMouseLeftButtonDown(this, sending);
        }

        if (this.mouseRightButtonDown) {
            var sending = { x: this.mouseX, y: this.mouseY, xyz: this.mousePositionOnEarth, direction: this.mouseDirection };
            if (!this.holdMouseRightButtonDown) {
                this.holdMouseRightButtonDown = true;
                if (this.controls[cnt].onMouseRightButtonClick)
                    this.controls[cnt].onMouseRightButtonClick(this, sending);
            }

            if (this.controls[cnt].onMouseRightButtonDown)
                this.controls[cnt].onMouseRightButtonDown(this, sending);
        }

        this.controls[cnt].everyFrame();
    }

    this.mouseIsMoving = false;
};

og.Renderer.prototype.Start = function () {
    this.ctx.Start();
};