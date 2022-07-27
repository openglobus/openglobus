/**
 * @module og/utils/FontAtlas
 */

'use strict';

import { Rectangle } from '../Rectangle.js';
import { TextureAtlas, TextureAtlasNode } from './TextureAtlas.js';
import { Deferred } from '../Deferred.js';

//TODO: get the value from shader module
const MAX_SIZE = 11;

class FontAtlas {
    constructor() {
        this.atlasesArr = [];
        this.atlasIndexes = {};
        this.atlasIndexesDeferred = [];
        this.tokenImageSize = 64;
        this.samplerArr = new Uint32Array(MAX_SIZE);
        this.sdfParamsArr = new Float32Array(MAX_SIZE * 4);
        this._handler = null;
    }

    assignHandler(handler) {
        this._handler = handler;
    }

    getFontIndex(face) {
        let fullName = this.getFullIndex(face);
        if (!this.atlasIndexesDeferred[fullName]) {
            this.atlasIndexesDeferred[fullName] = new Deferred();
        }
        return this.atlasIndexesDeferred[fullName].promise;
    }

    getFullIndex(face) {
        return face.trim().toLowerCase();
    }

    _applyFontDataToAtlas(atlas, data, index = 0) {
        let chars = data.chars;

        atlas.height = data.common.scaleH;
        atlas.width = data.common.scaleW;
        atlas.gliphSize = data.info.size;
        atlas.distanceRange = data.distanceField.distanceRange;

        let w = atlas.width,
            h = atlas.height,
            s = atlas.gliphSize;

        this.sdfParamsArr[index * 4] = w;
        this.sdfParamsArr[index * 4 + 1] = h;
        this.sdfParamsArr[index * 4 + 2] = s;
        this.sdfParamsArr[index * 4 + 3] = atlas.distanceRange;

        let idToChar = {};

        for (let i = 0; i < chars.length; i++) {
            let ci = chars[i];
            let ti = ci.char;

            idToChar[ci.id] = ti;

            let r = new Rectangle(ci.x, ci.y, ci.x + ci.width, ci.y + ci.height);

            let tc = new Array(12);

            tc[0] = r.left / w;
            tc[1] = r.top / h;

            tc[2] = r.left / w;
            tc[3] = r.bottom / h;

            tc[4] = r.right / w;
            tc[5] = r.bottom / h;

            tc[6] = r.right / w;
            tc[7] = r.bottom / h;

            tc[8] = r.right / w;
            tc[9] = r.top / h;

            tc[10] = r.left / w;
            tc[11] = r.top / h;

            let taNode = new TextureAtlasNode(r, tc);
            let ciNorm = ci.char.normalize('NFKC');
            let ciCode = ciNorm.charCodeAt();
            taNode.metrics = ci;
            taNode.metrics.nChar = ciNorm;
            taNode.metrics.nCode = ciCode;
            taNode.metrics.nWidth = taNode.metrics.width / s;
            taNode.metrics.nHeight = taNode.metrics.height / s;
            taNode.metrics.nAdvance = taNode.metrics.xadvance / s;
            taNode.metrics.nXOffset = taNode.metrics.xoffset / s;
            taNode.metrics.nYOffset = 1.0 - taNode.metrics.yoffset / s;
            taNode.emptySize = 1;

            atlas.nodes.set(ciNorm.charCodeAt(), taNode);
        }

        atlas.kernings = {};

        for (let i = 0; i < data.kernings.length; i++) {
            let ki = data.kernings[i];

            let first = ki.first,
                second = ki.second;

            //let charFirst = idToChar[first],
            //    charSecond = idToChar[second];

            // if (!atlas.kernings[charFirst]) {
            //     atlas.kernings[charFirst] = {};
            // }
            //
            // atlas.kernings[charFirst][charSecond] = ki.amount / s;

            if (!atlas.kernings[first]) {
                atlas.kernings[first] = {};
            }

            atlas.kernings[first][second] = ki.amount / s;
        }
    }

    initFont(faceName, dataJson, imageBase64) {
        let index = this.atlasesArr.length;
        let fullName = this.getFullIndex(faceName);

        this.atlasIndexes[fullName] = index;

        let def = this.atlasIndexesDeferred[fullName];
        if (!def) {
            def = this.atlasIndexesDeferred[fullName] = new Deferred();
        }

        this.samplerArr[this.atlasesArr.length] = index;

        // TODO: FontTextureAtlas();
        let atlas = new TextureAtlas();

        atlas.height = 0;
        atlas.width = 0;
        atlas.gliphSize = 0;
        atlas.distanceRange = 0;
        atlas.kernings = {};

        atlas.assignHandler(this._handler);

        this.atlasesArr[index] = atlas;

        this._applyFontDataToAtlas(atlas, dataJson, index);

        let img = new Image();
        img.onload = () => {
            this._createTexture(atlas, img);
            def.resolve(index);
        };
        img.src = imageBase64;
    }

    _createTexture(atlas, img) {
        atlas.createTexture(img);
    }

    loadFont(faceName, srcDir, atlasUrl) {

        let index = this.atlasesArr.length;
        let fullName = this.getFullIndex(faceName);

        this.atlasIndexes[fullName] = index;

        let def = this.atlasIndexesDeferred[fullName];
        if (!def) {
            def = this.atlasIndexesDeferred[fullName] = new Deferred();
        }

        this.samplerArr[this.atlasesArr.length] = index;

        // TODO: FontTextureAtlas();
        let atlas = new TextureAtlas();

        atlas.height = 0;
        atlas.width = 0;
        atlas.gliphSize = 0;
        atlas.distanceRange = 0;
        atlas.kernings = {};

        atlas.assignHandler(this._handler);
        this.atlasesArr[index] = atlas;

        fetch(`${srcDir}/${atlasUrl}`)
            .then(response => {
                if (!response.ok) {
                    throw Error(`Unable to load "${srcDir}/${atlasUrl}"`);
                }
                return response.json(response);
            })
            .then(data => {

                this._applyFontDataToAtlas(atlas, data, index);

                let img = new Image();
                img.onload = () => {
                    this._createTexture(atlas, img);
                    def.resolve(index);
                };

                img.src = `${srcDir}/${data.pages[0]}`;
                img.crossOrigin = "Anonymous";
            })
            .catch(err => {
                def.reject();
                return { 'status': "error", 'msg': err.toString() };
            });
    }
}

export { FontAtlas };