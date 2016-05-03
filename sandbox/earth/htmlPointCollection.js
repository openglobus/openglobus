goog.provide('HtmlPointCollection');

goog.require('og.inheritance');

/**
 *
 */
HtmlPointCollection = function () {
    og.inheritance.base(this, "HtmlPointCollection");

    this._points = [];
    this._visiblePoints = [];
    this._update = true;
    this._filter = function () {
        return true;
    };
};

og.inheritance.extend(HtmlPointCollection, og.node.RenderNode);

HtmlPointCollection.prototype.each = function (callback) {
    var i = this._points;
    while (i--) {
        callback(this._points[i]);
    }
};

HtmlPointCollection.prototype.update = function () {
    this._update = true;
};

HtmlPointCollection.prototype.add = function (point) {
    if (!point._collection) {
        point._collection = this;
        point._collectionIndex = this._points.length;
        this.renderer.div.appendChild(point.div);
        this._points.push(point);
        if (point._visibility && this._filter(point)) {
            this._visiblePoints.push(point);
        }
    }
};

HtmlPointCollection.prototype.setFilter = function (callback) {
    this._filter = callback;
};

HtmlPointCollection.prototype.removePoint = function (point) {
    //todo
};

HtmlPointCollection.prototype.initialization = function () {

};

HtmlPointCollection.prototype.frame = function () {
    //update filter
    if (this._update) {
        this._update = false;
        this._visiblePoints = null;
        this._visiblePoints = [];
        var i = this._points.length;
        while (i--) {
            var pi = this._points[i];
            if (pi._visibility && this._filter(pi)) {
                this._visiblePoints.push(pi);
            }
        }
    }

    //render points
    var poi = this._visiblePoints;
    var i = poi.length;
    var cam = this.renderer.activeCamera;
    var r = globus.planet.ellipsoid._a;
    var h = cam._lonLat.height;
    while (i--) {
        var lookLength = cam.eye.distance(poi[i]._cartesian);
        var d = Math.sqrt((r + h) * (r + h) - r * r);
        if (d > lookLength) {
            poi[i].setScreen(cam.project(poi[i]._cartesian));
            poi[i].showAnimate();
        } else {
            poi[i].hideAnimate();
        }
    }
};