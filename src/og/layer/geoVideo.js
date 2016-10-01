goog.provide('og.layer.GeoVideo');

goog.require('og.layer.IGeoImage');
goog.require('og.inheritance');

/**
 * Used to load and display a video sttream over specific corner coordinates on the globe, implements og.layer.IGeoImage interface.
 * @class
 */
og.layer.GeoVideo = function (name, options) {
    og.inheritance.base(this, name, options);

    this._animate = true;

    this._video = null;
    this._src = options.src;

    if (options.video) {
        this._image = options.image;
        this._src = options.image.src;
        this._frameWidth = og.math.nextHighestPowerOfTwo(this._image.width),
        this._frameHeight = og.math.nextHighestPowerOfTwo(this._image.height);
        this._sourceReady = true;
    }
};

og.inheritance.extend(og.layer.GeoVideo, og.layer.IGeoImage);

/**
 * Sets layer visibility.
 * @public
 * @param {boolean} visibility - Layer visibility.
 */
og.layer.GeoVideo.prototype.setVisibility = function (visibility) {
    if (visibility != this._visibility) {
        this._visibility = visibility;
        if (this._isBaseLayer && visibility) {
            this._planet.setBaseLayer(this);
        }
        this._planet.updateVisibleLayers();
        this.events.dispatch(this.events.visibilitychange, this);

        //remove from creator
        if (visibility) {
            this._sourceReady && this._planet._geoImageCreator.add(this);
            this._video && this._video.play();
        } else {
            this._sourceReady && this._planet._geoImageCreator.remove(this);
            this._video && this._video.pause();
        }
    }
};

og.layer.GeoVideo.prototype._createSourceTexture = function () {
    if (!this._sourceCreated) {
        this._sourceTexture = this._planet.renderer.handler.createTexture_n(this._video);
        this._sourceCreated = true;
    } else {
        var gl = this._planet.renderer.handler.gl;
        gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._video);
    }
};

og.layer.GeoVideo.prototype.loadMaterial = function (material) {
    material.imageIsLoading = true;
    this._creationProceeding = true;
    if (!this._sourceReady && this._src) {
        this._video = document.createElement('video');
        var that = this;
        this._video.oncanplay = function () {
            that._frameWidth = og.math.nextHighestPowerOfTwo(this.videoWidth);
            that._frameHeight = og.math.nextHighestPowerOfTwo(this.videoHeight);
            this.width = this.videoWidth;
            this.height = this.videoHeight;
            this.play();
            that._sourceReady = true;
            that._planet._geoImageCreator.add(that);
        };

        this._video.onerror = function () {
            var err = "unknown error";
            switch (video.error.code) {
                case 1: err = "video loading aborted"; break;
                case 2: err = "network loading error"; break;
                case 3: err = "video decoding failed / corrupted data or unsupported codec"; break;
                case 4: err = "video not supported"; break;
            };
            console.log("Error: " + err + " (errorcode=" + video.error.code + ")", "color:red;");
        };

        this._video.autoplay = true;
        this._video.loop = true;
        this._video.src = this._src;

        this._video.setAttribute("playsinline", "");
        this._video.setAttribute("webkit-playsinline", "");
    } else {
        this._planet._geoImageCreator.add(this);
    }
};

og.layer.GeoVideo.prototype.abortMaterialLoading = function (material) {
    this._video && (this._video.src = '');
    this._creationProceeding = false;
    material.imageIsLoading = false;
    material.imageReady = false;
};