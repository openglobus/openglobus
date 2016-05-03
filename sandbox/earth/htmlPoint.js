goog.provide('HtmlPoint');

goog.require('og.LonLat');

/**
 *
 */
HtmlPoint = function (options) {
    options = options || {};

    this._lonlat = options.lonlat ? og.lonLat(options.lonlat[0], options.lonlat[1]) : og.lonLat();
    this._cartesian = globus.planet.ellipsoid.lonLatToCartesian(this._lonlat);
    this._collection = null;
    this._collectionIndex = -1;
    this._visibility = options.visibility != undefined ? options.visibility : true;

    this.properties = options.properties || {};

    this.div = document.createElement("div");
    this.div.classList.add("HtmlPoint");
    this.div.style.top = "0px";
    this.div.style.left = "0px";
};

HtmlPoint.prototype.showAnimate = function () {
    this.div.style.display = "block";
};

HtmlPoint.prototype.hideAnimate = function () {
    this.div.style.display = "none";
};

HtmlPoint.prototype.setScreen = function (xy) {
    this.div.style.left = xy.x + "px";
    this.div.style.top = xy.y + "px";
};


HtmlPoint.prototype.setLonLat = function (lonlat) {
    this._lonlat.lon = lonlat.lon;
    this._lonlat.lat = lonlat.lat;
    this._cartesian = globus.planet.ellipsoid.lonLatToCartesian(lonlat);
};

HtmlPoint.prototype.remove = function () {
    //todo
};

HtmlPoint.prototype.addTo = function (collection) {
    collection.add(this);
};

HtmlPoint.prototype.setVisibility = function (visibility) {
    this._visibility = visibility;
    if (this._collection) {
        this._collection.update();
    }
};