goog.provide('og.layer.CanvasTiles');

goog.require('og.inheritance');
goog.require('og.layer.Layer');
goog.require('og.ImageCanvas');

/**
 * Layer used to rendering each tile as a separate canvas object.
 * @class
 * @extends {og.layer.Layer}
 * //TODO: make asynchronous handler.
 * @param {String} [name="noname"] - Layer name.
 * @param {Object} options:
 * @param {number} [options.opacity=1.0] - Layer opacity.
 * @param {Array.<number,number,number>} [options.transparentColor=[-1,-1,-1]] - RGB color that defines transparent color.
 * @param {number} [options.minZoom=0] - Minimal visibility zoom level.
 * @param {number} [options.maxZoom=0] - Maximal visibility zoom level.
 * @param {string} [options.attribution] - Layer attribution that displayed in the attribution area on the screen.
 * @param {boolean} [options.isBaseLayer=false] - Base layer flag.
 * @param {boolean} [options.visibility=true] - Layer visibility.
 */
og.layer.CanvasTiles = function (name, options) {
    options = options || {};

    og.inheritance.base(this, name, options);

    /**
     * Draw tile callback. 
     * @type {og.layer.CanvasTiles~drawTileCallback}
     * @public
     */
    this.drawTile = null;
};

og.inheritance.extend(og.layer.CanvasTiles, og.layer.Layer);

/**
 * Start to handle tile segment material.
 * @public
 * @virtual
 * @param {og.planetSegment.Material} mateial
 */
og.layer.CanvasTiles.prototype.loadMaterial = function (material) {

    var seg = material.segment;
    if (seg.tileZoom >= this.minZoom &&
        seg.tileZoom <= this.maxZoom) {

        if (this.drawTile) {
            /**
             * Tile custom draw function.
             * @callback og.layer.CanvasTiles~drawTileCallback
             * @param {og.planetSegment.Material} material
             * @param {applyCanvasCallback} applyCanvasCallback
             */
            this.drawTile(material,
                /**
                 * Apply canvas.
                 * @callback applyCanvasCallback
                 * @param {Object} canvas
                 */
                function (canvas) {
                    material.imageReady = false;
                    material.applyTexture(canvas);
                });
        } else {
            material.textureNotExists();
        }
    }
};