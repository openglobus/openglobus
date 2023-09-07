import {Deferred} from '../Deferred';
import {Rectangle} from '../Rectangle';
import {TextureAtlas, TextureAtlasNode} from './TextureAtlas';
import {Handler} from "../webgl/Handler";
import {HTMLImageElementExt} from "./ImagesCacheManager";

//@todo: get the value from shader module
const MAX_SIZE = 11;

interface IChar {
    id: number;
    char: string;
    width: number;
    height: number;
    x: number;
    y: number;
    chnl: number;
    index: number;
    page: number;
    xadvance: number;
    xoffset: number;
    yoffset: number;
}

interface IKerning {
    first: number;
    second: number;
    amount: number;
}

export interface IFontParams {
    common: {
        scaleH: number;
        scaleW: number;
    };
    info: {
        size: number;
    };
    distanceField: {
        distanceRange: number;
    }
    chars: IChar[];
    kernings: IKerning[];
    pages: string[];
}

class FontTextureAtlas extends TextureAtlas {
    public width: number;
    public height: number;
    public gliphSize: number;
    public distanceRange: number;
    public override nodes: Map<number, FontTextureAtlasNode>;
    public kernings: Record<number, Record<number, number>>;

    constructor(width?: number, height?: number) {
        super(width, height);
        this.width = 0;
        this.height = 0;
        this.gliphSize = 0;
        this.distanceRange = 0;
        this.nodes = new Map<number, FontTextureAtlasNode>();
        this.kernings = {};
    }

    public override get(key: number): FontTextureAtlasNode | undefined {
        return this.nodes.get(key);
    }
}

interface IMetrics extends IChar {
    nChar: string;
    nCode: number;
    nWidth: number;
    nHeight: number
    nAdvance: number;
    nXOffset: number;
    nYOffset: number;
}

class FontTextureAtlasNode extends TextureAtlasNode {
    public metrics: IMetrics;
    public emptySize: number;

    constructor(rect: Rectangle, texCoords: number[]) {
        super(rect, texCoords);
        this.emptySize = 1;
        this.metrics = {
            id: 0,
            char: "",
            width: 0,
            height: 0,
            x: 0,
            y: 0,
            chnl: 0,
            index: 0,
            page: 0,
            xadvance: 0,
            xoffset: 0,
            yoffset: 0,

            nChar: "",
            nCode: 0,
            nWidth: 0,
            nHeight: 0,
            nAdvance: 0,
            nXOffset: 0,
            nYOffset: 0
        }
    }
}

class FontAtlas {
    public atlasesArr: FontTextureAtlas[];
    public samplerArr: Uint32Array;
    public sdfParamsArr: Float32Array;

    protected atlasIndexes: Record<string, number>;
    protected atlasIndexesDeferred: Record<string, Deferred<number>>;
    protected tokenImageSize: number;
    protected _handler: Handler | null;

    constructor() {
        this.atlasesArr = [];
        this.atlasIndexes = {};
        this.atlasIndexesDeferred = {};
        this.tokenImageSize = 64;
        this.samplerArr = new Uint32Array(MAX_SIZE);
        this.sdfParamsArr = new Float32Array(MAX_SIZE * 4);
        this._handler = null;
    }

    public assignHandler(handler: Handler) {
        this._handler = handler;
    }

    public getFontIndex(face: string): Promise<number> {
        let fullName = this.getFullIndex(face);
        if (!this.atlasIndexesDeferred[fullName]) {
            this.atlasIndexesDeferred[fullName] = new Deferred<number>();
        }
        return this.atlasIndexesDeferred[fullName].promise;
    }

    public getFullIndex(face: string): string {
        return face.trim().toLowerCase();
    }

    protected _applyFontDataToAtlas(atlas: FontTextureAtlas, data: IFontParams, index: number = 0) {
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

        let idToChar: Record<number, string> = {};

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

            let taNode = new FontTextureAtlasNode(r, tc);
            let ciNorm = ci.char.normalize('NFKC');
            let ciCode = ciNorm.charCodeAt(0);

            //taNode.metrics = ci;

            let m = taNode.metrics;

            m.id = ci.id;
            m.char = ci.char;
            m.width = ci.width;
            m.height = ci.height;
            m.x = ci.x;
            m.y = ci.y;
            m.chnl = ci.chnl;
            m.index = ci.index;
            m.page = ci.page;
            m.xadvance = ci.xadvance;
            m.xoffset = ci.xoffset;
            m.yoffset = ci.yoffset;

            m.nChar = ciNorm;
            m.nCode = ciCode;
            m.nWidth = taNode.metrics.width / s;
            m.nHeight = taNode.metrics.height / s;
            m.nAdvance = taNode.metrics.xadvance / s;
            m.nXOffset = taNode.metrics.xoffset / s;
            m.nYOffset = 1.0 - taNode.metrics.yoffset / s;

            taNode.emptySize = 1;

            atlas.nodes.set(ciNorm.charCodeAt(0), taNode);
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

    public initFont(faceName: string, dataJson: IFontParams, imageBase64: string) {
        let index = this.atlasesArr.length;
        let fullName = this.getFullIndex(faceName);

        this.atlasIndexes[fullName] = index;

        let def = this.atlasIndexesDeferred[fullName];
        if (!def) {
            def = this.atlasIndexesDeferred[fullName] = new Deferred<number>();
        }

        this.samplerArr[this.atlasesArr.length] = index;

        // TODO: FontTextureAtlas();
        let atlas = new FontTextureAtlas();

        atlas.height = 0;
        atlas.width = 0;
        atlas.gliphSize = 0;
        atlas.distanceRange = 0;
        atlas.kernings = {};

        atlas.assignHandler(this._handler!);

        this.atlasesArr[index] = atlas;

        this._applyFontDataToAtlas(atlas, dataJson, index);

        let img = new Image();
        img.onload = () => {
            this._createTexture(atlas, img);
            def.resolve(index);
        };
        img.src = imageBase64;
    }

    protected _createTexture(atlas: FontTextureAtlas, img: HTMLImageElementExt) {
        atlas.createTexture(img);
    }

    public loadFont(faceName: string, srcDir: string, atlasUrl: string) {

        let index = this.atlasesArr.length;
        let fullName = this.getFullIndex(faceName);

        this.atlasIndexes[fullName] = index;

        let def = this.atlasIndexesDeferred[fullName];
        if (!def) {
            def = this.atlasIndexesDeferred[fullName] = new Deferred<number>();
        }

        this.samplerArr[this.atlasesArr.length] = index;

        // TODO: FontTextureAtlas();
        let atlas = new FontTextureAtlas();

        atlas.height = 0;
        atlas.width = 0;
        atlas.gliphSize = 0;
        atlas.distanceRange = 0;
        atlas.kernings = {};

        atlas.assignHandler(this._handler!);
        this.atlasesArr[index] = atlas;

        fetch(`${srcDir}/${atlasUrl}`)
            .then((response: Response) => {
                if (!response.ok) {
                    throw Error(`Unable to load "${srcDir}/${atlasUrl}"`);
                }
                //return response.json(response);
                return response.json();
            })
            .then((data: IFontParams) => {

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
                return {'status': "error", 'msg': err.toString()};
            });
    }
}

export {FontAtlas};
