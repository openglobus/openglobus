'use strict';

/**
 * Console logging singleton object.
 * @class
 */
export class Cons {
    constructor() {
        this._container = document.createElement("div");
        this._container.classList.add("ogConsole");
        this._container.style.display = "none";
        if (document.body) {
            document.body.appendChild(this._container);
        }

        this._visibility = false;
    }

    getVisibility() {
        return this._visibility;
    }

    setVisibility(visibility) {
        if (this._visibility != visibility) {
            this._visibility = visibility;
            if (this._visibility) {
                this.show();
            } else {
                this.hide();
            }
        }
    }

    /**
     * Show console panel.
     * @public
     */
    show() {
        if (!this._container.parentNode) {
            if (document.body) {
                document.body.appendChild(this._container);
            }
        }
        this._container.style.display = "block";
        this._visibility = true;
    }

    /**
     * Hide console panel.
     * @public
     */
    hide() {
        this._container.style.display = "none";
        this._visibility = false;
    }

    /**
     * Adds error text in the console.
     * @public
     * @param {string} str - Error text.
     */
    logErr(str) {
        var d = document.createElement("div");
        d.classList.add("ogConsole-text");
        d.classList.add("ogConsole-error");
        d.innerHTML = "error: " + str;
        console.trace(d.innerHTML);
        this._container.appendChild(d);
        this.show();
    }

    /**
     * Adds warning text in the console.
     * @public
     * @param {string} str - Warning text.
     */
    logWrn(str) {
        var d = document.createElement("div");
        d.classList.add("ogConsole-text");
        d.classList.add("ogConsole-warning");
        d.innerHTML = "warning: " + str;
        console.trace(d.innerHTML);
        this._container.appendChild(d);
        this.show();
    }

    /**
     * Adds log text in the console.
     * @public
     * @param {string} str - Log text.
     * @param {Object} [style] - HTML style.
     */
    log(str, style) {
        var d = document.createElement("div");
        d.classList.add("ogConsole-text");
        if (style) {
            for (var s in style) {
                d.style[s] = style[s];
            }
        }
        d.innerHTML = str;
        console.trace(str);
        this._container.appendChild(d);
        this.show();
    }
}

export const cons = new Cons();