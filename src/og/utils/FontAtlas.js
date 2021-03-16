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

        this.scaleH = 0;
        this.scaleW = 0;
        this.gliphSize = 0;
        this.distanceRange = 0;
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

    loadMSDF(faceName, imageUrl, atlasUrl) {

        let index = this.atlasesArr.length;
        let fullName = this.getFullIndex(faceName);

        this.atlasIndexes[fullName] = index;

        let def = this.atlasIndexesDeferred[fullName];

        this.samplerArr[this.atlasesArr.length] = index;

        let atlas = new TextureAtlas();

        atlas.assignHandler(this._handler);
        this.atlasesArr[index] = atlas;

        let img = new Image();
        img.onload = () => {
            atlas.createTexture(img);
        };
        img.src = imageUrl;

        fetch(atlasUrl)
            .then(response => {
                if (!response.ok) {
                    throw Error(`Unable to load '${atlasUrl}'`);
                }
                return response.json(response);
            })
            .then(data => {
                let chars = data.chars;

                this.height = data.common.scaleH;
                this.width = data.common.scaleW;
                this.gliphSize = data.info.size;
                this.distanceRange = data.distanceField.distanceRange;

                //...
                this.kernings = data.kernings;

                let w = this.width,
                    h = this.height,
                    s = this.gliphSize;

                for (let i = 0; i < chars.length; i++) {
                    let ci = chars[i];
                    let ti = ci.char;

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

                console.log(data);
                def.resolve(index);
            })
            .catch(err => {
                def.reject();
                return { 'status': "error", 'msg': err.toString() };
            });
    }
}

export { FontAtlas };