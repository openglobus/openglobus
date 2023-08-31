import * as units from '../utils/units.js';
import {Control} from './Control.js';
import {heightMode} from '../utils/units.js';
import {LonLat} from '../LonLat';
import {throttle} from '../utils/shared';

const DECIMAL_TEMPLATE =
    `<div class="og-lat-side"></div><div class="og-lat-val"></div>
    <div class="og-lon-side"></div><div class="og-lon-val"></div>
    <div class="og-height"></div>
    <div class="og-units-height"></div>`;

const DEGREE_TEMPLATE =
    `<div class="og-lat-side"></div><div class="og-lat-val"></div>
    <div class="og-lon-side"></div><div class="og-lon-val"></div>
    <div class="og-height"></div>
    <div class="og-units-height"></div>`;

const CENTER_SVG = '<svg width="12" height="12"><g><path stroke-width="1" stroke-opacity="1" d="M6 0L6 12M0 6L12 6" stroke="#337ab7"></path></g></svg>';

const TYPE_HTML = [DECIMAL_TEMPLATE, DEGREE_TEMPLATE];

/**
 * Control displays mouse or screen center Earth coordinates.
 * @param {Boolean} [options.center] - Earth coordinates by screen center otherwise mouse pointer. False is default.
 * @param {Boolean} [options.type] - Coordinates shown: 0 - is decimal degrees, 1 - degrees, 2 - mercator geodetic coordinates.
 */
export class EarthCoordinates extends Control {
    _type: any;
    _TYPE_FUNC: ((ll: LonLat) => void)[];
    _showFn: any;
    _lonLat = new LonLat();
    _latSideEl: any;
    _lonSideEl: any;
    _latValEl: any;
    _lonValEl: any;
    _heightEl: any;
    _altUnitVal: any;
    _heightModeVal: any;
    _altUnit: any;
    _heightMode: any;
    _centerMode: any;
    _el: any;

    constructor(options: { name?: string, heightMode?: string, centerMode?: string, altitudeUnit?: string, autoActivate?: boolean, type?: number } = {}) {
        super(options);

        this._type = options.type || 0;

        this._TYPE_FUNC = [this._SHOW_DECIMAL, this._SHOW_DEGREE];

        this._showFn = null;

        this._latSideEl = null;
        this._lonSideEl = null;
        this._latValEl = null;
        this._lonValEl = null;
        this._heightEl = null;

        this._altUnitVal = options.altitudeUnit || "m";
        this._heightModeVal = options.heightMode || "ell";

        this._altUnit = (units as any)[this._altUnitVal];
        this._heightMode = (heightMode as any)[this._heightModeVal];

        this._centerMode = options.centerMode != undefined ? options.centerMode : true;
    }

    _SHOW_DECIMAL(ll: LonLat) {
        if (ll) {
            let lat = ll.lat,
                lon = ll.lon;

            if (lat >= 0) {
                this._latSideEl.innerHTML = 'N';
            } else {
                this._latSideEl.innerHTML = 'S';
            }

            if (lon >= 0) {
                this._lonSideEl.innerHTML = 'E';
            } else {
                this._lonSideEl.innerHTML = 'W';
            }

            this._latValEl.innerHTML = Math.abs(lat).toFixed(5) + '°';
            this._lonValEl.innerHTML = Math.abs(lon).toFixed(5) + '°';
        }
    }

    _SHOW_DEGREE(ll: LonLat) {
        if (ll) {
            let lat = ll.lat,
                lon = ll.lon;

            if (lat >= 0) {
                this._latSideEl.innerHTML = 'N';
            } else {
                this._latSideEl.innerHTML = 'S';
            }

            if (lon >= 0) {
                this._lonSideEl.innerHTML = 'E';
            } else {
                this._lonSideEl.innerHTML = 'W';
            }

            let t = 0;

            let deg = lat < 0 ? Math.ceil(lat) : Math.floor(lat);
            let min = Math.floor(t = Math.abs((lat - deg)) * 60);
            let sec = Math.floor((t - min) * 6000) / 100.0;
            this._latValEl.innerHTML = Math.abs(deg) + '°' + min + "'" + sec.toFixed(0) + '"';

            deg = lon < 0 ? Math.ceil(lon) : Math.floor(lon);
            min = Math.floor(t = Math.abs((lon - deg)) * 60);
            sec = Math.floor((t - min) * 6000) / 100.0;
            this._lonValEl.innerHTML = Math.abs(deg) + '°' + min + "'" + sec.toFixed(0) + '"';
        }
    }

    _createCenterEl() {
        let el = document.createElement('div');
        el.className = 'og-center-icon';
        el.innerHTML = CENTER_SVG;
        return el;
    }

    _updateUnits() {
        this._heightMode = (heightMode as any)[this._heightModeVal];
        this._altUnit = (units as any)[this._altUnitVal];
        this._el.querySelector(".og-units-height").innerHTML = units.toString(this._altUnit);
        this._showHeight();
    }

    _refreshCoordinates() {

        if (this._type >= this._TYPE_FUNC.length) {
            this._type = 0;
        }

        this._el.innerHTML = TYPE_HTML[this._type];

        this._latSideEl = this._el.querySelector(".og-lat-side");
        this._lonSideEl = this._el.querySelector(".og-lon-side");
        this._latValEl = this._el.querySelector(".og-lat-val");
        this._lonValEl = this._el.querySelector(".og-lon-val");
        this._heightEl = this._el.querySelector(".og-height");

        this._showFn = this._TYPE_FUNC[this._type];
        this._showFn(this._lonLat);
    }

    override oninit() {
        this._el = document.createElement('div');
        this._el.classList.add("og-coordinates");

        this.renderer.div.appendChild(this._el);

        this._el.addEventListener("click", () => {
            this._type++;
            this._refreshCoordinates();
            this._updateUnits();
            this._showHeight();
        });

        if (this._centerMode) {
            this.renderer.div.appendChild(this._createCenterEl());
            this.renderer.activeCamera.events.on("moveend", this._grabCoordinates, this);
            this.renderer.activeCamera.events.on("moveend", throttle((e: any) => this._showHeight(), 400, true), this);
        } else {
            this.renderer.events.on("mousemove", this._grabCoordinates, this);
            this.renderer.events.on("mousestop", throttle((e: any) => this._showHeight(), 400, true), this);
        }

        this._refreshCoordinates();

        this._updateUnits();
    }

    _grabCoordinates(px: any) {
        let scrPx;
        let r = this.renderer;
        if (this._centerMode) {
            scrPx = r.handler.getCenter();
        } else {
            scrPx = px;
        }
        this._lonLat = this.planet!.getLonLatFromPixelTerrain(scrPx) as LonLat;
        this._showFn(this._lonLat);
    }

    async _showHeight() {
        if (this._lonLat && this.planet) {
            let alt = 0;
            this._heightEl.style.opacity = 0.7;
            if (this._heightMode === heightMode.ell) {
                alt = await this.planet.getHeightAboveELL(this._lonLat);
                alt = units.convertExt(true, units.m, this._altUnit, alt);
            } else if (this._heightMode === heightMode.msl) {
                alt = await this.planet.getHeightDefault(this._lonLat);
                alt = units.convertExt(true, units.m, this._altUnit, alt);
            }
            this._heightEl.style.opacity = 1.0;
            this._heightEl.innerHTML = alt.toString();
        }
    }
}
