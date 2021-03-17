/**
 * @module og/utils/FontAtlas
 */

'use strict';

import { TextureAtlas } from './TextureAtlas.js';
import { QueueArray } from '../QueueArray.js';
import { Rectangle } from '../Rectangle.js';
import { TextureAtlasNode } from './TextureAtlas.js';
import { Deferred } from '../Deferred.js';

class FontAtlas {
    constructor() {
        this.atlasesArr = [];
        this.atlasIndexes = {};
        this.atlasIndexesDeferred = [];
        this.tokenImageSize = 64;
        this.samplerArr = [0];
        this._handler = null;
    }

    assignHandler(handler) {
        this._handler = handler;
    }

    getFontIndex(face, style, weight) {
        let fullName = this.getFullIndex(face, style, weight);
        if (!this.atlasIndexesDeferred[fullName]) {
            this.atlasIndexesDeferred[fullName] = new Deferred();
        }
        return this.atlasIndexesDeferred[fullName].promise;
    }

    getFullIndex(face, style, weight) {
        face = face && face.trim().toLowerCase();
        //if (!face) {
        //    face = this.defaultFace;
        //}
        return face + " " + ((style && style.toLowerCase()) || "normal") + " " + ((weight && weight.toLowerCase()) || "normal");
    }

    loadMSDF(faceName, srcDir, atlasUrl) {

        let index = this.atlasesArr.length;
        let fullName = this.getFullIndex(faceName);

        this.atlasIndexes[fullName] = index;

        let def = this.atlasIndexesDeferred[fullName];

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
                let chars = data.chars;

                atlas.height = data.common.scaleH;
                atlas.width = data.common.scaleW;
                atlas.gliphSize = data.info.size;
                atlas.distanceRange = data.distanceField.distanceRange;

                let w = atlas.width,
                    h = atlas.height,
                    s = atlas.gliphSize;

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

                    atlas.nodes[ti] = new TextureAtlasNode(r, tc);
                    atlas.nodes[ti].metrics = ci;

                    atlas.nodes[ti].metrics.nWidth = atlas.nodes[ti].metrics.width / s;
                    atlas.nodes[ti].metrics.nHeight = atlas.nodes[ti].metrics.height / s;
                    atlas.nodes[ti].metrics.nAdvance = atlas.nodes[ti].metrics.xadvance / s;
                    atlas.nodes[ti].metrics.nXOffset = atlas.nodes[ti].metrics.xoffset / s;
                    atlas.nodes[ti].metrics.nYOffset = 1.0 - atlas.nodes[ti].metrics.yoffset / s;

                    atlas.nodes[ti].emptySize = 1;
                }

                atlas.kernings = {};

                for (let i = 0; i < data.kernings.length; i++) {
                    let ki = data.kernings[i];

                    let first = ki.first,
                        second = ki.second;

                    let charFirst = idToChar[first],
                        charSecond = idToChar[second];

                    if (!atlas.kernings[charFirst]) {
                        atlas.kernings[charFirst] = {};
                    }

                    atlas.kernings[charFirst][charSecond] = ki.amount / s;
                }

                let img = new Image();
                img.onload = () => {
                    atlas.createTexture(img);
                    def.resolve(index);
                };

                img.src = `${srcDir}/${data.pages[0]}`;
            })
            .catch(err => {
                def.reject();
                return { 'status': "error", 'msg': err.toString() };
            });
    }
}

export { FontAtlas };