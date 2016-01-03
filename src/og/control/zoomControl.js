goog.provide('og.control.ZoomControl');

goog.require('og.inheritance');
goog.require('og.control.Control');
goog.require('og.control.MouseNavigation');

og.control.ZoomControl = function (options) {
    og.inheritance.base(this, options);

    this.distDiff = 0.33;
    this.stepsCount = 5;
    this.stepsForward = null;
    this.stepIndex = 0;

    this.planet = null;
};

og.inheritance.extend(og.control.ZoomControl, og.control.Control);

og.control.ZoomControl.prototype.init = function () {
    var zoomDiv = document.createElement('div'),
        btnZoomIn = document.createElement('button'),
        btnZoomOut = document.createElement('button');

    zoomDiv.className = 'ogZoomControl';
    btnZoomIn.className = 'ogZoomButton ogZoomIn';
    btnZoomOut.className = 'ogZoomButton ogZoomOut';

    zoomDiv.appendChild(btnZoomIn);
    zoomDiv.appendChild(btnZoomOut);

    this.renderer.div.appendChild(zoomDiv);

    var that = this;
    btnZoomIn.onclick = function (e) {
        that.zoomIn();
    };

    btnZoomOut.onclick = function (e) {
        that.zoomOut();
    };

    this.planet = this.renderer.renderNodes.Earth;
    this.renderer.events.on("draw", this, this.onDraw);
};

og.control.ZoomControl.prototype.zoomIn = function () {
    this.planet.normalMapCreator.active = false;
    this.planet.terrainProvider.active = false;
    this.stepIndex = this.stepsCount;
    this.stepsForward = og.control.MouseNavigation.getMovePointsFromPixelTerrain(this.renderer.activeCamera,
        this.planet, this.stepsCount, this.distDiff * 1.7, this.renderer.getCenter(), true, this.renderer.activeCamera._n.getNegate());
};

og.control.ZoomControl.prototype.zoomOut = function () {
    this.planet.normalMapCreator.active = false;
    this.planet.terrainProvider.active = false;
    this.stepIndex = this.stepsCount;
    this.stepsForward = og.control.MouseNavigation.getMovePointsFromPixelTerrain(this.renderer.activeCamera,
        this.planet, this.stepsCount, this.distDiff * 2, this.renderer.getCenter(), false, this.renderer.activeCamera._n.getNegate());
};

og.control.ZoomControl.prototype.onDraw = function (e) {

    if (this.stepIndex) {
        var sf = this.stepsForward[this.stepsCount - this.stepIndex--];
        var cam = this.renderer.activeCamera;
        cam.eye = sf.eye;
        cam._v = sf.v;
        cam._u = sf.u;
        cam._n = sf.n;
        cam.update();
    } else {
        this.planet.normalMapCreator.active = true;
        this.planet.terrainProvider.active = true;
    }
};