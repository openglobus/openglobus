/**
 * Console logging singleton object.
 * @class
 */
export class Cons {

    protected _container: HTMLElement;
    protected _visibility: boolean;

    constructor() {
        this._container = document.createElement("div");
        this._container.classList.add("ogConsole");
        this._container.style.display = "none";
        if (document.body) {
            document.body.appendChild(this._container);
        }

        this._visibility = false;
    }

    public getVisibility(): boolean {
        return this._visibility;
    }

    public setVisibility(visibility: boolean) {
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
    public show() {
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
    public hide() {
        this._container.style.display = "none";
        this._visibility = false;
    }

    /**
     * Adds error text in the console.
     * @public
     * @param {string} str - Error text.
     */
    public logErr(str: string) {
        let d = document.createElement("div");
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
    public logWrn(str: string) {
        let d = document.createElement("div");
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
     */
    public log(str: string) {
        let d = document.createElement("div");
        d.classList.add("ogConsole-text");
        d.innerHTML = str;
        console.trace(str);
        this._container.appendChild(d);
        this.show();
    }
}

export const cons = new Cons();