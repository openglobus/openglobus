import {CLOSE_ICON} from './ui/icons';
import {createLonLat, stringTemplate} from "./utils/shared";
import {EventsHandler} from "./Events";
import {LonLat} from "./LonLat";
import {Planet} from "./scene/Planet";
import {NumberArray2, Vec2} from "./math/Vec2";
import {NumberArray3, Vec3} from "./math/Vec3";
import {View, IViewParams, ViewEventsList} from './ui/View';

const TEMPLATE = `<div class="og-popup {className}">
      <div class="og-popup-content-wrapper">
        <div class="og-popup-content"></div>
      </div>
      <div class="og-popup-tip-container">
        <div class="og-popup-tip"></div>
      </div>
      <div class="og-popup-toolbar">
        <div class="og-popup-btn og-popup-close">${CLOSE_ICON}</div>
      </div>
      <div class="og-popup-title">{title}</div>
    </div>`;

interface IPopupParams extends IViewParams {
    planet: Planet;
    title?: string;
    className?: string;
    visibility?: boolean;
    content?: string;
    offset?: NumberArray2;
    lonLat?: LonLat | NumberArray2 | NumberArray3;
}

type PopupEventsList = ["open", "close"];
const POPUP_EVENTS: PopupEventsList = ["open", "close"];

class Popup extends View<null> {

    public override events: EventsHandler<PopupEventsList> & EventsHandler<ViewEventsList>;

    public $content: HTMLElement | null;
    public $tip: HTMLElement | null;
    public $title: HTMLElement | null;

    protected _content: string | HTMLElement | null;

    protected _planet: Planet;

    protected _offset: NumberArray2;

    protected _lonLat: LonLat;

    protected _cartPos: Vec3;

    protected _visibility: boolean;

    constructor(options: IPopupParams) {
        super({
            template: stringTemplate(TEMPLATE, {
                title: options.title || ""
            }),
            classList: options.className ? [options.className] : [],
            ...options
        });

        //@ts-ignore
        this.events = this.events.registerNames(POPUP_EVENTS);

        this._content = options.content || "";

        this.$content = null;
        this.$tip = null;
        this.$title = null;

        this._planet = options.planet;

        this._offset = options.offset || [0, 0];

        this._lonLat = createLonLat(options.lonLat);

        this._cartPos = new Vec3();

        this._visibility = options.visibility || false;

        this.render();
    }

    _updatePosition() {
        this.setCartesian3v(this._cartPos);
    }

    public setScreen(p: Vec2) {
        if (this._planet) {
            let r = this._planet.renderer!.handler.pixelRatio;
            this.el!.style.transform =
                `translate(${p.x / r - this.clientWidth * 0.5}px, ${p.y / r - this._planet.renderer!.handler.canvas!.clientHeight - this.$tip!.clientHeight}px)`;
        }
    }

    public get clientWidth(): number {
        return this.el ? this.el.clientWidth : 0;
    }

    public get clientHeight(): number {
        return this.el ? this.el.clientHeight : 0;
    }

    public setOffset(x: number = 0, y: number = 0): this {
        this._offset[0] = x;
        this._offset[1] = y;
        if (this.el) {
            this.el.style.left = `${x}px`;
            this.el.style.bottom = `${y}px`;
        }
        return this;
    }

    public override render(params?: any): this {
        super.render(params);

        this.$content = this.select(".og-popup-content")!;
        this.$title = this.select(".og-popup-title")!;
        this.$tip = this.select(".og-popup-tip-container")!;

        this.setOffset(this._offset[0], this._offset[1]);
        this.setContent(this._content);
        this.setLonLat(this._lonLat);
        this.setVisibility(this._visibility);
        this.select(".og-popup-close")!.addEventListener("click", () => {
            this.hide();
        });

        return this;
    }

    public setVisibility(visibility: boolean): this {
        if (visibility) {
            this.show();
        } else {
            this.hide();
        }
        return this;
    }

    public getContainer(): HTMLElement | null {
        return this.$content;
    }

    public getToolbarContainer(): HTMLElement {
        return this.select(".og-popup-toolbar")!;
    }

    public show(): this {
        this._visibility = true;
        if (this._planet) {
            this._planet.events.on("draw", this._updatePosition, this);
            this.appendTo(this._planet.renderer!.div as HTMLElement);
            this.events.dispatch(this.events.open, this);
        }
        return this;
    }

    public hide(): this {
        this._visibility = false;
        if (this.el && this.el.parentNode) {
            this._planet.events.off("draw", this._updatePosition);
            this.el.parentNode.removeChild(this.el);
            this.events.dispatch(this.events.close, this);
        }
        return this;
    }

    public setCartesian3v(cart: Vec3, height: number = 0): this {
        this._cartPos = cart;

        if (this._planet) {
            let cam = this._planet.camera;
            let f = this._planet.ellipsoid.equatorialSize + height,
                g = cam._lonLat.height;

            let look = cart.sub(cam.eye),
                v = Math.sqrt((f + g) * (f + g) - f * f);

            if (v > look.length() && cam.getForward().dot(look.normalize()) > 0.0) {
                this.el!.style.display = "block";
                this.setScreen(cam.project(cart));
            } else {
                this.el!.style.display = "none";
            }
        }
        return this;
    }

    public setTitle(html: string) {
        if (this.$title) {
            this.$title.innerHTML = html;
        }
    }

    public setLonLat(lonLat: LonLat) {
        this._lonLat = lonLat;
        if (this._planet) {
            this.setCartesian3v(this._planet.ellipsoid.lonLatToCartesian(lonLat), lonLat.height);
        }
    }

    public setContent(content?: string | HTMLElement | null) {
        if (content) {
            this.clear();
            this._content = content;
            if (this.$content) {
                if (typeof content === "string") {
                    this.$content.innerHTML = content;
                } else {
                    this.$content.appendChild(content);
                }
            }
        }
    }

    public clear() {
        this._content = null;
        if (this.$content) {
            this.$content.innerHTML = "";
        }
    }
}

export {Popup};
