goog.provide('og.control.ZoomControl');

goog.require('og.inheritance');
goog.require('og.control.BaseControl');
goog.require('og.control.MouseNavigation');

/**
 * Planet zoom buttons control.
 * @class
 * @extends {og.control.BaseControl}
 * @params {Object} [options] - Control options.
 */
og.control.ZoomControl = function (options) {
    og.inheritance.base(this, options);

    options = options || {};

    this.distDiff = 0.33;
    this.stepsCount = 5;
    this.stepsForward = null;
    this.stepIndex = 0;

    this.planet = null;
};

og.inheritance.extend(og.control.ZoomControl, og.control.BaseControl);

og.control.zoomControl = function (options) {
    return new og.control.ZoomControl(options);
};

og.control.ZoomControl.prototype.oninit = function () {
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

    this.renderer.events.on("draw", this._draw, this);
};

/** 
 * Planet zoom in.
 * @public
 */
og.control.ZoomControl.prototype.zoomIn = function () {

    this._deactivate = true;
    this.planet.normalMapCreator.active = false;
    this.planet.terrainProvider.active = false;
    this.planet.layersActivity = false;
    //this.planet.geoImageTileCreator.active = false;

    this.stepIndex = this.stepsCount;
    this.stepsForward = og.control.MouseNavigation.getMovePointsFromPixelTerrain(this.renderer.activeCamera,
        this.planet, this.stepsCount, this.distDiff * 1.7, this.renderer.getCenter(), true, this.renderer.activeCamera._n.negateTo());
};

/** 
 * Planet zoom out.
 * @public
 */
og.control.ZoomControl.prototype.zoomOut = function () {

    this._deactivate = true;

    this.planet.normalMapCreator.active = false;
    this.planet.terrainProvider.active = false;
    this.planet.layersActivity = false;
    //this.planet.geoImageTileCreator.active = false;

    this.stepIndex = this.stepsCount;
    this.stepsForward = og.control.MouseNavigation.getMovePointsFromPixelTerrain(this.renderer.activeCamera,
        this.planet, this.stepsCount, this.distDiff * 2, this.renderer.getCenter(), false, this.renderer.activeCamera._n.negateTo());
};

og.control.ZoomControl.prototype._draw = function (e) {

    var cam = this.renderer.activeCamera;

    if (this.stepIndex) {
        var sf = this.stepsForward[this.stepsCount - this.stepIndex--];
        cam.eye = sf.eye;
        cam._v = sf.v;
        cam._u = sf.u;
        cam._n = sf.n;
        cam.update();
    } else if (!cam._flying) {
        if (this._deactivate) {
            this.planet.normalMapCreator.active = true;
            this.planet.terrainProvider.active = true;
            //this.planet.geoImageTileCreator.active = true;
            this.planet.layersActivity = true;
            this._deactivate = false;
        }
    }
};