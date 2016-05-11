goog.provide('HtmlPoint');

goog.require('og.LonLat');
goog.require('og.Events');

/**
 *
 */
HtmlPoint = function (options) {
    options = options || {};

    this._id = HtmlPoint._staticCounter++;

    this._lonlat = options.lonlat ? og.lonLat(options.lonlat[0], options.lonlat[1]) : og.lonLat();
    this._cartesian = globus.planet.ellipsoid.lonLatToCartesian(this._lonlat);
    this._collection = null;
    this._collectionIndex = -1;
    this._visibility = options.visibility != undefined ? options.visibility : true;

    this.properties = options.properties || {};

    this.events = new og.Events();
    this.events.registerNames(["click"]);

    this.color = options.color || "#d71921";
    this.background = options.background || null;
    this.video = options.video || null;
    this.picture = options.picture || null;

    this.title;
    this.circle;
    this.image;
    this.point;
    this.line;
    this.mark;
    this.htmlPoint;

    this.frameCounter = 0;
    this.anim = null;

    this.animation = false;

    this.selected = false;

    this._create();
};

HtmlPoint._staticCounter = 0;

HtmlPoint.frames = [
    {
        mark: { opacity: "0" },
    }, {
        mark: { opacity: "0.2" },
    }, {
        mark: { opacity: "0.5" },
    }, {
        circle: { marginLeft: "0px", height: "0px", width: "0px", display: "none" },
        line: { height: "0px" },
        title: { opacity: "0" },
        mark: { opacity: "0.7" }
    }, {
        line: { height: "4px" },
        title: { opacity: "0.2" },
        mark: { opacity: "1.0" }
    }, {
        line: { height: "7px" },
        title: { opacity: "0.3" }
    }, {
        line: { height: "10px" },
        title: { opacity: "0.4" }
    }, {
        line: { height: "13px" },
        title: { opacity: "0.5" }
    }, {
        circle: { marginLeft: "-2px", height: "4px", width: "4px", display: "block" },
        title: { opacity: "0.6" }
    }, {
        circle: { marginLeft: "-4px", height: "8px", width: "8px" },
        title: { opacity: "0.7" },
        point: { width: "0px", height: "0px", backgroundColor: "white" }
    }, {
        circle: { marginLeft: "-6px", height: "12px", width: "12px" },
        title: { opacity: "0,8" },
        point: { width: "2px", height: "2px", backgroundColor: "white" }
    }, {
        circle: { marginLeft: "-10px", height: "20px", width: "20px" },
        title: { opacity: "0.9" },
        point: { width: "4px", height: "4px", backgroundColor: "white" }
    }, {
        circle: { marginLeft: "-12px", height: "24px", width: "24px" },
        title: { opacity: "1.0" },
        mark: { opacity: "1.0" },
        line: { height: "13px" },
        point: { width: "7px", height: "7px", backgroundColor: "white" }
    }];

HtmlPoint.clickFrames = [
    {
        point: { width: "7px", height: "7px", opacity: "1.0", backgroundColor: "white" },
    }, {
        point: { width: "7px", height: "7px", opacity: "0.7", backgroundColor: "white" },
    }, {
        point: { width: "7px", height: "7px", opacity: "0.3", backgroundColor: "white" },
    }, {
        point: { width: "7px", height: "7px", opacity: "0.0", backgroundColor: "white" },
    }, {
        circle: { marginLeft: "-12px", height: "24px", width: "24px" },
        point: { width: "7px", height: "7px", opacity: "0.0" },
        image: { opacity: "0.0", height: "22px", width: "22px" }
    }, {
        circle: { marginLeft: "-13px", height: "26px", width: "26" },
        point: { width: "9px", height: "9px", opacity: "0.2" },
        image: { opacity: "0.1", height: "24px", width: "24px" }
    }, {
        circle: { marginLeft: "-16px", height: "32px", width: "32" },
        point: { opacity: "0.3" },
        image: { opacity: "0.2", height: "30px", width: "30px" }
    }, {
        circle: { marginLeft: "-18px", height: "36px", width: "36px" },
        point: { opacity: "0.4" },
        image: { opacity: "0.3", height: "34px", width: "34px" }
    }, {
        circle: { marginLeft: "-32px", height: "64px", width: "64px" },
        point: { opacity: "0.5" },
        image: { opacity: "0.5", height: "62px", width: "62px" }
    }, {
        circle: { marginLeft: "-35px", height: "70px", width: "70px" },
        point: { width: "7px", height: "7px", opacity: "0.55" },
        image: { opacity: "0.7", height: "68px", width: "68px" }
    }, {
        circle: { marginLeft: "-48px", height: "96px", width: "96px" },
        point: { width: "50px", height: "50px", opacity: "0.6" },
        image: { opacity: "1.0", height: "94px", width: "94px" }
    }];


HtmlPoint.prototype._create = function () {

    this.title = document.createElement("p");
    this.title.classList.add("title");
    this.title.style.opacity = 0;
    this.title.style.visibility = "hidden";

    this.circle = document.createElement("div");
    this.circle.classList.add("circle");
    this.circle.style.bottom = "0px";
    this.circle.style.marginLeft = "-12px";
    this.circle.style.height = "24px";
    this.circle.style.width = "24px";
    this.circle.style.backgroundColor = this.color;

    this.image = document.createElement("div");
    this.image.classList.add("image");
    this.image.style.display = "none";
    this.image.style.opacity = "0";
    this.image.style.height = "22px";
    this.image.style.width = "22px";
    this.image.style.backgroundImage = "url(" + this.background + ")";
    this.circle.appendChild(this.image);

    var ar1 = document.createElement("div");
    ar1.classList.add("arrow-right1");
    this.image.appendChild(ar1);

    var ar2 = document.createElement("div");
    ar2.classList.add("arrow-right2");
    this.image.appendChild(ar2);

    this.point = document.createElement("div");
    this.point.classList.add("point");
    this.point.style.height = "6px";
    this.point.style.width = "6px";
    this.point.style.backgroundColor = "rgb(255, 255, 255);";
    this.circle.appendChild(this.point);

    this.line = document.createElement("div");
    this.line.classList.add("line");
    this.line.style.height = "13px";
    this.line.style.backgroundColor = this.color;


    this.mark = document.createElement("div");
    this.mark.classList.add("mark");
    this.mark.style.opacity = "1";
    this.mark.style.backgroundColor = this.color;

    this.htmlPoint = document.createElement("div");
    this.htmlPoint.classList.add("pin");
    this.htmlPoint.id = "point_" + this._id;

    this.htmlPoint.appendChild(this.title);
    this.htmlPoint.appendChild(this.circle);
    this.htmlPoint.appendChild(this.line);
    this.htmlPoint.appendChild(this.mark);

    this.frameCounter = 0;

    var that = this;
    this.circle.onclick = function () {
        that.events.dispatch(that.events.click, that);
    };
};

HtmlPoint.prototype.showAnimate = function () {
    if (this.selected) {

    } else if (this.frameCounter <= HtmlPoint.frames.length - 1) {
        this.htmlPoint.style.display = "block";
        this._appendFrame(HtmlPoint.frames[this.frameCounter++]);
        if (this.frameCounter >= HtmlPoint.frames.length) {
            this.frameCounter = HtmlPoint.frames.length - 1;
            this.animation = false;
        }
    }
};

HtmlPoint.prototype.hideAnimate = function () {
    if (this.selected) {

    } else if (this.frameCounter >= 0) {
        this._appendFrame(HtmlPoint.frames[this.frameCounter]);
        if (this.frameCounter <= 0) {
            this.frameCounter = 0;
            this.htmlPoint.style.display = "none";
            this.animation = false;
        } else {
            this.frameCounter--;
        }
    }
};

HtmlPoint.prototype._appendFrame = function (f) {

    if (f.mark) {
        this.mark.style.opacity = f.mark.opacity;
    }

    if (f.title) {
        this.title.style.opacity = f.title.opacity;
    }

    if (f.line) {
        this.line.style.height = f.line.height;
    }

    if (f.circle) {
        this.circle.style.marginLeft = f.circle.marginLeft;
        this.circle.style.height = f.circle.height;
        this.circle.style.width = f.circle.width;
        this.circle.style.display = f.circle.display;
    }

    if (f.point) {
        this.point.style.width = f.point.width;
        this.point.style.height = f.point.height;
        this.point.style.opacity = f.point.opacity;
        this.point.style.backgroundColor = f.point.backgroundColor || this.color;
    }

    if (f.image) {
        this.image.style.opacity = f.image.opacity;
        this.image.style.width = f.image.width;
        this.image.style.height = f.image.height;
    }
}

HtmlPoint.prototype.setScreen = function (xy) {
    this.htmlPoint.style.transform = "translate(" + xy.x + "px, " + (xy.y - this._collection.renderer.handler.canvas.height) + "px)";
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