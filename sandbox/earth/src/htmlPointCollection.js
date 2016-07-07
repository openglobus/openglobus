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

    this.selectedPoint = null;
};

og.inheritance.extend(HtmlPointCollection, og.scene.RenderNode);

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
        this.renderer.div.appendChild(point.htmlPoint);
        this._points.push(point);
        if (point._visibility && this._filter(point)) {
            this._visiblePoints.push(point);
        }

        var that = this;
        point.events.on("click", null, function () {
            if (point.selected) {
                console.log("video");
            } else {
                that.hideClickAnimation(that.selectedPoint);
                point.selected = true;
                that.selectedPoint = point;
                that.showClickAnimation(point);
            }
        });
    }
};

HtmlPointCollection.prototype.setFilter = function (callback) {
    this._filter = callback;
};

HtmlPointCollection.prototype.removePoint = function (point) {
    //todo
};

HtmlPointCollection.prototype.initialization = function () {
    var that = this;
    this.renderer.events.on("mouselbuttonclick", null, function () {
        that.hideClickAnimation(that.selectedPoint);
        that.selectedPoint = null;
    });
};

HtmlPointCollection.prototype.showClickAnimation = function (point) {
    var that = this;
    var frameCounter = 0;
    point.image.style.display = "block";
    var frame = function () {
        point._appendFrame(HtmlPoint.clickFrames[frameCounter++]);
        if (frameCounter >= HtmlPoint.clickFrames.length) {
            that.renderer.events.off("draw", frame);
        }
    };

    this.renderer.events.on("draw", null, frame);
};

HtmlPointCollection.prototype.hideClickAnimation = function (point) {
    if (point) {
        var that = this;
        var frameCounter = HtmlPoint.clickFrames.length - 1;
        point.image.style.display = "none";
        var frame = function () {
            point._appendFrame(HtmlPoint.clickFrames[frameCounter]);
            if (frameCounter <= 0) {
                that.renderer.events.off("draw", frame);
                point.selected = false;
            } else {
                frameCounter--;
            }
        };

        this.renderer.events.on("draw", null, frame);
    }
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