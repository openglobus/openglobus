goog.provide('og.layer.GeoVideo');

goog.require('og.layer.BaseGeoImage');
goog.require('og.inheritance');

/**
 * Used to load and display a video stream by specific corners coordinates on the globe, implements og.layer.BaseGeoImage interface.
 * @class
 * @extends {og.layer.BaseGeoImage}
 */
og.layer.GeoVideo = function (name, options) {
    og.inheritance.base(this, name, options);

    /**
     * @protected
     * @const
     * @type {Boolean}
     */
    this._animate = true;

    /**
     * HTML5 video element object.
     * @private
     * @type {Object}
     */
    this._video = options.videoElement || null;

    /**
     * VIdeo source url path.
     * @private
     * @type {String}
     */
    this._src = options.src || null;
};

og.inheritance.extend(og.layer.GeoVideo, og.layer.BaseGeoImage);

/**
 * Sets video source url path.
 * @public
 * @param {String} srs - Video url path.
 */
og.layer.GeoVideo.prototype.setSrc = function (src) {
    this._planet && this._planet._geoImageCreator.remove(this);
    this._src = src;
    this._sourceReady = false;
};

/**
 * Sets HTML5 video object.
 * @public
 * @param {Object} video - HTML5 video element object.
 */
og.layer.GeoVideo.prototype.setVideoElement = function (video) {
    this._planet && this._planet._geoImageCreator.remove(this);
    this._video = video;
    this._src = video.src;
    this._sourceReady = false;
};

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

/**
 * Creates or refresh source video GL texture.
 * @virtual
 * @protected
 */
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

/**
 * @private
 */
og.layer.GeoVideo.prototype._onCanPlay = function (video) {
    this._frameWidth = video.videoWidth;
    this._frameHeight = video.videoHeight;
    video.width = video.videoWidth;
    video.height = video.videoHeight;
    video.play();
    this._sourceReady = true;
    this._planet._geoImageCreator.add(this);
};

/**
 * @private
 */
og.layer.GeoVideo.prototype._onError = function (video) {
    var err = "unknown error";
    switch (video.error.code) {
        case 1: err = "video loading aborted"; break;
        case 2: err = "network loading error"; break;
        case 3: err = "video decoding failed / corrupted data or unsupported codec"; break;
        case 4: err = "video not supported"; break;
    };
    console.log("Error: " + err + " (errorcode=" + video.error.code + ")");
};

/**
 * Loads planet segment material. In this case - GeoImage source video.
 * @virtual
 * @public
 * @param {og.planetSegment.Material} material - GeoImage planet material.
 */
og.layer.GeoVideo.prototype.loadMaterial = function (material) {
    material.isLoading = true;
    this._creationProceeding = true;
    if (!this._sourceReady && this._src) {
        if (this._video) {
            if (this._video.readyState === this._video.HAVE_ENOUGH_DATA) {
                this._onCanPlay(this._video);
            } else if (this._video.src) {
                var that = this;
                this._video.addEventListener('canplay', function (e) {
                    that._onCanPlay(this);
                });
            }
        } else {
            this._video = document.createElement('video');
            var that = this;
            this._video.addEventListener('canplay', function () {
                that._onCanPlay(this);
            });
            this._video.addEventListener('error', function () {
                that._onError(this);
            });
        }
        this._video.autoplay = true;
        this._video.loop = true;
        this._video.src = this._src;
        this._video.setAttribute("playsinline", "");
        this._video.setAttribute("webkit-playsinline", "");
    } else {
        this._planet._geoImageCreator.add(this);
    }
};

/**
 * @virtual
 * @param {og.planetSegment.Material} material - GeoImage material.
 */
og.layer.GeoVideo.prototype.abortMaterialLoading = function (material) {
    this._video && (this._video.src = '');
    this._creationProceeding = false;
    material.isLoading = false;
    material.isReady = false;
};

og.layer.GeoVideo.prototype._renderingProjType1 = function () {
    var p = this._planet,
    h = p.renderer.handler,
    gl = h.gl,
    creator = p._geoImageCreator;

    this._refreshFrame && this._createFrame();

    if (this._sourceCreated) {
        var gl = this._planet.renderer.handler.gl;
        gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._video);
    } else {
        this._sourceTexture = this._planet.renderer.handler.createTexture_n(this._video);
        this._sourceCreated = true;
    }

    var f = creator._framebuffer;
    f.setSize(this._frameWidth, this._frameHeight);
    f.activate();

    h.shaderPrograms.geoImageTransform.activate();
    var sh = h.shaderPrograms.geoImageTransform._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    var tr = this.transparentColor[0],
        tg = this.transparentColor[1],
        tb = this.transparentColor[2];

    gl.disable(gl.CULL_FACE);

    f.bindOutputTexture(this._materialTexture);
    gl.clearColor(tr, tg, tb, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, creator._texCoordsBuffer);
    gl.vertexAttribPointer(sha.texCoords._pName, creator._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBuffer);
    gl.vertexAttribPointer(sha.corners._pName, this._gridBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(shu.extentParams._pName, this._extentMercParams);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
    gl.uniform1i(shu.sourceTexture._pName, 0);
    sh.drawIndexBuffer(gl.TRIANGLE_STRIP, creator._indexBuffer);
    f.deactivate();

    gl.enable(gl.CULL_FACE);

    this._ready = true;

    this._creationProceeding = false;
};

og.layer.GeoVideo.prototype._renderingProjType0 = function () {
    var p = this._planet,
    h = p.renderer.handler,
    gl = h.gl,
    creator = p._geoImageCreator;

    this._refreshFrame && this._createFrame();
    if (!this._sourceCreated) {
        this._sourceTexture = this._planet.renderer.handler.createTexture_n(this._video);
        this._sourceCreated = true;
    } else {
        var gl = this._planet.renderer.handler.gl;
        gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._video);
    }

    var f = creator._framebuffer;
    f.setSize(this._frameWidth, this._frameHeight);
    f.activate();

    h.shaderPrograms.geoImageTransform.activate();
    var sh = h.shaderPrograms.geoImageTransform._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    var tr = this.transparentColor[0],
        tg = this.transparentColor[1],
        tb = this.transparentColor[2];

    gl.disable(gl.CULL_FACE);

    f.bindOutputTexture(this._materialTexture);
    gl.clearColor(tr, tg, tb, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, creator._texCoordsBuffer);
    gl.vertexAttribPointer(sha.texCoords._pName, creator._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBuffer);
    gl.vertexAttribPointer(sha.corners._pName, this._gridBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(shu.extentParams._pName, this._extentWgs84Params);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
    gl.uniform1i(shu.sourceTexture._pName, 0);
    sh.drawIndexBuffer(gl.TRIANGLE_STRIP, creator._indexBuffer);
    f.deactivate();

    gl.enable(gl.CULL_FACE);

    this._ready = true;

    this._creationProceeding = false;
};