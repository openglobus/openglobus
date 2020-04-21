'use strict';

import { Events } from './Events.js';
import { Vec3 } from './math/Vec3.js';
import { getHTML, parseHTML, stringTemplate } from './utils/shared.js';

const TEMPLATE =
    `<div class="og-popup">
      <div class="og-popup-content-wrapper">
        <div class="og-popup-content"></div>
      </div>
      <div class="og-popup-tip-container">
        <div class="og-popup-tip"></div>
      </div>
      <div class="og-popup-toolbar">
        <div class="og-popup-btn og-popup-close">×</div>
      </div>
      <div class="og-popup-title">
      </div>
    </div>`;

class Popup {
    constructor(options) {

        this._id = Popup._staticCounter++;

        this.events = new Events(["open", "close"]);

        this.el = null;

        this._title = options.title || "";

        this._content = options.content || "";

        this._contentEl = null;

        this._titleEl = null;

        this._planet = options.planet;

        this._cartPos = new Vec3();

        this._offset = options.offset || [0, 0];

        this.render();
    }

    static get _staticCounter() {
        if (!this.__counter__ && this.__counter__ !== 0) {
            this.__counter__ = 0;
        }
        return this.__counter__;
    }

    static set _staticCounter(n) {
        this.__counter__ = n;
    }

    _renderTemplate(params) {
        return parseHTML(getHTML(TEMPLATE, params || {}))[0];
    }

    setOffset(x = 0, y = 0) {
        this._offset[0] = x;
        this._offset[1] = y;
        if (this.el) {
            this.el.style.left = `${x}px`;
            this.el.style.bottom = `${y}px`;
        }
    }

    render(params) {
        this.el = this._renderTemplate(params);
        this._contentEl = this.el.querySelector(".og-popup-content");
        this._titleEl = this.el.querySelector(".og-popup-title")
        this.setOffset(this._offset[0], this._offset[1]);
        this.setContent(this._content);
        this.setTitle(this._title);
        this.el.querySelector(".og-popup-close").addEventListener("click", (e) => {
            this.hide();
        });
        return this;
    }

    getContainer() {
        return this._contentEl;
    }

    getToolbarContainer() {
        return this.el.querySelector(".og-popup-toolbar");
    }

    get clientWidth() {
        return this.el.clientWidth;
    }

    get clientHeight() {
        return this.el.clientHeight;
    }

    show() {
        if (this._planet) {
            this._planet.events.on("draw", this._updatePosition, this);
            this._planet.renderer.div.appendChild(this.el);
            this.events.dispatch(this.events.open, this);
        }
        return this;
    }

    hide() {
        if (this.el.parentNode) {
            this._planet.events.off("draw", this._updatePosition);
            this.el.parentNode.removeChild(this.el);
            this.events.dispatch(this.events.close, this);
        }
        return this;
    }

    _updatePosition() {
        this.setCartesian3v(this._cartPos);
    }

    _setScreen(p) {
        if (this._planet) {
            this.el.style.transform = "translate(" + (p.x - this.clientWidth * 0.5) + "px, " + (p.y - this._planet.renderer.handler.canvas.height - this.clientHeight * 0.5) + "px)"
        }
    }

    setCartesian3v(cart, height = 0) {

        this._cartPos = cart;

        if (this._planet) {
            let cam = this._planet.camera;
            let f = this._planet.ellipsoid._a + height,
                g = cam._lonLat.height;

            let look = cart.sub(cam.eye),
                v = Math.sqrt((f + g) * (f + g) - f * f);

            if (v > look.length() && cam.getForward().dot(look.normalize()) > 0.0) {
                this.el.style.display = "block";
                this._setScreen(cam.project(cart));
            } else {
                this.el.style.display = "none";
            }
        }
        return this;
    }

    setTitle(html) {
        this._title = html;
        this._titleEl.innerHTML = html;
        return this;
    }

    setLonLat(lonLat) {
        if (this._planet) {
            this.setCartesian3v(this._planet.ellipsoid.lonLatToCartesian(lonLat), lonLat.height);
        }
        return this;
    }

    setContent(html) {
        this._content = html;
        this._contentEl.innerHTML = html;
        return this;
    }

    clear() {
        this.setContent("");
    }
}

export { Popup };