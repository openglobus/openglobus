/**
 * @module og/layer/GeoTexture2d
 */

'use strict';

import * as math from '../math.js';
import { BaseGeoImage } from './BaseGeoImage.js';

class GeoTexture2d extends BaseGeoImage {
    constructor(name, options) {
        super(name, options);

        this._sourceTexture = options.texture || null;

        if (options.texture) {
            this._sourceReady = true;
            this._sourceCreated = true;
        }

        this._frameWidth = options.frameWidth ? math.nextHighestPowerOfTwo(options.frameWidth) : 256;
        this._frameHeight = options.frameHeight ? math.nextHighestPowerOfTwo(options.frameHeight) : 256;

        this._animate = true;
    }

    get instanceName() {
        return "GeoTexture2d";
    }

    loadMaterial(material) {
        this._planet._geoImageCreator.add(this);
    }

    bindTexture(texture) {
        this._sourceReady = true;
        this._sourceCreated = true;
        this._sourceTexture = texture;
    }

    setSize(width, height) {
        this._frameWidth = width;
        this._frameHeight = height;
        this._frameCreated = false;
    }

    abortMaterialLoading(material) {
        this._creationProceeding = false;
        material.isLoading = false;
        material.isReady = false;
    }

    _renderingProjType1() {
        var p = this._planet,
            h = p.renderer.handler,
            gl = h.gl,
            creator = p._geoImageCreator;

        this._refreshFrame && this._createFrame();

        var f = creator._framebuffer;
        f.setSize(this._frameWidth, this._frameHeight);
        f.activate();

        h.programs.geoImageTransform.activate();
        var sh = h.programs.geoImageTransform._program;
        var sha = sh.attributes,
            shu = sh.uniforms;

        gl.disable(gl.CULL_FACE);

        f.bindOutputTexture(this._materialTexture);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, creator._texCoordsBuffer);
        
        gl.vertexAttribPointer(sha.texCoords, 2, gl.UNSIGNED_SHORT, true, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBuffer);
        gl.vertexAttribPointer(sha.corners, this._gridBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(shu.extentParams, this._extentMercParams);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
        gl.uniform1i(shu.sourceTexture, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, creator._indexBuffer);
        gl.drawElements(gl.TRIANGLE_STRIP, creator._indexBuffer.numItems, gl.UNSIGNED_INT, 0);
        f.deactivate();

        gl.enable(gl.CULL_FACE);

        this._ready = true;

        this._creationProceeding = false;
    }

    _renderingProjType0() {
        var p = this._planet,
            h = p.renderer.handler,
            gl = h.gl,
            creator = p._geoImageCreator;

        var width = this._frameWidth,
            height = this._frameHeight;

        this._refreshFrame && this._createFrame();

        var f = creator._framebuffer;
        f.setSize(width, height);
        f.activate();

        h.programs.geoImageTransform.activate();
        var sh = h.programs.geoImageTransform._program;
        var sha = sh.attributes,
            shu = sh.uniforms;

        gl.disable(gl.CULL_FACE);

        f.bindOutputTexture(this._materialTexture);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, creator._texCoordsBuffer);

        gl.vertexAttribPointer(sha.texCoords, 2, gl.UNSIGNED_SHORT, true, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._gridBuffer);
        gl.vertexAttribPointer(sha.corners, this._gridBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(shu.extentParams, this._extentWgs84Params);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
        gl.uniform1i(shu.sourceTexture, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, creator._indexBuffer);
        gl.drawElements(gl.TRIANGLE_STRIP, creator._indexBuffer.numItems, gl.UNSIGNED_INT, 0);
        f.deactivate();

        gl.enable(gl.CULL_FACE);

        this._ready = true;

        this._creationProceeding = false;
    }
}

export { GeoTexture2d };