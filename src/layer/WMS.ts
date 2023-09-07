import * as mercator from "../mercator";
import {Extent} from "../Extent";
import {LonLat} from "../LonLat";
import {Segment} from "../segment/Segment";
import {XYZ, IXYZParams} from "./XYZ";

interface IWMSParams extends IXYZParams {
    extra?: any;
    layers: string;
    imageWidth?: number;
    imageHeight?: number;
    version?: string;
}

/**
 * Used to display WMS services as tile layers on the globe.
 * @class
 * @extends {XYZ}
 * @param {string} name - Layer name.
 * @param {Object} options - Options:
 * @param {number} [options.opacity=1.0] - Layer opacity.
 * @param {number} [options.minZoom=0] - Minimal visibility zoom level.
 * @param {number} [options.maxZoom=0] - Maximal visibility zoom level.
 * @param {string} [options.attribution] - Layer attribution that displayed in the attribution area on the screen.
 * @param {boolean} [options.isBaseLayer=false] - Base layer flag.
 * @param {boolean} [options.visibility=true] - Layer visibility.
 * @param {string} options.url - WMS url source.
 * @param {number} [options.width=256] - Tile width.
 * @param {number} [options.height=256] - Tile height.
 * @param {string} options.layers - WMS layers string.
 * @param {string} [options.version="1.1.1"] - WMS version.
 * @param {Object} extra  - Extra parameters (by WMS reference or by WMS service vendors) to pass to WMS service.
 * @example:
 * new og.layer.WMS("USA States", {
 *     isBaseLayer: false,
 *     url: "http://openglobus.org/geoserver/",
 *     layers: "topp:states",
 *     opacity: 0.5,
 *     zIndex: 50,
 *     attribution: 'USA states - geoserver WMS example',
 *     version: "1.1.1",
 *     visibility: false }, {
 *     transparent: true,
 *     sld: "style.sld"}
 * );
 */
class WMS extends XYZ {

    protected _extra: string;

    /**
     * WMS layers string.
     * @public
     * @type {string}
     */
    public layers: string;

    /**
     * WMS tile width.
     * @public
     * @type {number}
     */
    public imageWidth: number;

    /**
     * WMS tile height.
     * @public
     * @type {number}
     */
    public imageHeight: number;

    protected _getBbox: (extent: Extent) => string;

    protected _version: string;

    constructor(name: string | null, options: IWMSParams) {
        super(name, options);

        this._extra = new URLSearchParams(options.extra).toString();

        if (!options.extent) {
            this.setExtent(new Extent(new LonLat(-180.0, -90), new LonLat(180.0, 90)));
        }

        this.layers = options.layers;

        /**
         * WMS tile width.
         * @public
         * @type {number}
         */
        this.imageWidth = options.imageWidth || 256;

        /**
         * WMS tile height.
         * @public
         * @type {number}
         */
        this.imageHeight = options.imageHeight || 256;

        this._getBbox = WMS.get_bbox_v1_1_1;

        this._version = "";

        this.setVersion(options.version);
    }

    static createRequestUrl(
        url: string,
        layers: string,
        format: string = "image/png",
        version: string = "1.1.1",
        request: string = "GetMap",
        srs: string,
        bbox: string,
        width: number = 256,
        height: number = 256,
        extra?: string
    ): string {
        return `${url}/?LAYERS=${layers}&FORMAT=${format}&SERVICE=WMS&VERSION=${version}&REQUEST=${request}&SRS=${srs}&BBOX=${bbox}&WIDTH=${width}&HEIGHT=${height}` + (extra ? `&${extra}` : "");
    }

    static get_bbox_v1_1_1(extent: Extent): string {
        return `${extent.getWest()},${extent.getSouth()},${extent.getEast()},${extent.getNorth()}`;
    }

    static get_bbox_v1_3_0(extent: Extent): string {
        return `${extent.getSouth()},${extent.getWest()},${extent.getNorth()},${extent.getEast()}`;
    }

    public override _checkSegment(segment: Segment) {
        return true;
    }

    public override get instanceName(): string {
        return "WMS";
    }

    protected override _createUrl(segment: Segment): string {
        return WMS.createRequestUrl(
            this.url,
            this.layers,
            "image/png",
            this._version,
            "GetMap",
            segment._projection.code,
            this._getBbox(segment.getExtent()),
            this.imageWidth,
            this.imageHeight,
            this._extra
        );
    }

    public setVersion(version?: string) {
        if (version) {
            this._version = version;
        } else {
            this._version = "1.1.1";
        }

        if (this._version === "1.1.1") {
            this._getBbox = WMS.get_bbox_v1_1_1;
        } else if (version === "1.3.0") {
            this._getBbox = WMS.get_bbox_v1_3_0;
        }
    }

    public override _correctFullExtent() {
        const e = this._extent;
        const em = this._extentMerc;

        const ENLARGE_MERCATOR_LON = mercator.POLE + 50000;
        const ENLARGE_MERCATOR_LAT = mercator.POLE + 50000;

        if (e.northEast.lat === 90.0) {
            em.northEast.lat = ENLARGE_MERCATOR_LAT;
        }

        if (e.northEast.lon === 180.0) {
            em.northEast.lon = ENLARGE_MERCATOR_LON;
        }

        if (e.southWest.lat === -90.0) {
            em.southWest.lat = -ENLARGE_MERCATOR_LAT;
        }

        if (e.southWest.lon === -180.0) {
            em.southWest.lon = -ENLARGE_MERCATOR_LON;
        }
    }
}

export {WMS};

