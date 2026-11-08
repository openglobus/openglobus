import { BaseGeoImage } from "../layer/BaseGeoImage";
import { Control, type IControlParams } from "./Control";
import { Layer } from "../layer/Layer";
import { ToggleButton } from "../ui/ToggleButton";
import type { IMouseState } from "../renderer/RendererEvents";

const ICON_BUTTON_SVG = `<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M16 13l6.964 4.062-2.973.85 2.125 3.681-1.732 1-2.125-3.68-2.223 2.15L16 13zm-2-7h2v2h5a1 1 0 0 1 1 1v4h-2v-3H10v10h4v2H9a1 1 0 0 1-1-1v-5H6v-2h2V9a1 1 0 0 1 1-1h5V6zM4 14v2H2v-2h2zm0-4v2H2v-2h2zm0-4v2H2V6h2zm0-4v2H2V2h2zm4 0v2H6V2h2zm4 0v2h-2V2h2zm4 0v2h-2V2h2z" fill="#000"/></svg>`;

interface IGeoImageDragControlParams extends IControlParams {}

export class GeoImageDragControl extends Control {
    protected _cornerIndex: number;
    protected _catchCorner: boolean;
    protected _toggleBtn: ToggleButton;
    protected _draggedLayer: BaseGeoImage | null;

    constructor(options: IGeoImageDragControlParams = {}) {
        super(options);

        this._cornerIndex = -1;
        this._catchCorner = false;
        this._draggedLayer = null;

        this._toggleBtn = new ToggleButton({
            classList: ["og-map-button", "og-geoimagegrag_button"],
            icon: ICON_BUTTON_SVG
        });
    }

    override oninit() {
        this._toggleBtn.appendTo(this.renderer!.topRightContainer());

        this.planet!.events.on(
            "layeradd",
            (e: Layer) => {
                if (this.isActive()) {
                    this._bindLayer(e);
                }
            },
            this
        );

        this._toggleBtn.events.on("change", (isActive: boolean) => {
            if (isActive) {
                this.activate();
            } else {
                this.deactivate();
            }
        });
    }

    override onactivate() {
        super.onactivate();

        const p = this.planet!;
        for (let i = 0; i < p.layers.length; i++) {
            this._bindLayer(p.layers[i]);
        }
    }

    override ondeactivate() {
        super.ondeactivate();
        this._release();
        const p = this.planet!;
        for (let i = 0; i < p.layers.length; i++) {
            this._unbindLayer(p.layers[i]);
        }
    }

    _bindLayer(layer: Layer) {
        if (layer instanceof BaseGeoImage) {
            layer.events.on("mousemove", this._onMouseMove, this);
            layer.events.on("mouseleave", this._onMouseLeave, this);
            layer.events.on("ldown", this._onLDown, this);
        }
    }

    protected _unbindLayer(layer: Layer) {
        if (layer instanceof BaseGeoImage) {
            layer.events.off("mousemove", this._onMouseMove);
            layer.events.off("mouseleave", this._onMouseLeave);
            layer.events.off("ldown", this._onLDown);
        }
    }

    protected _onLDown(ms: IMouseState) {
        if (this._cornerIndex !== -1 && !this._catchCorner) {
            this._catchCorner = true;
            this._draggedLayer = ms.pickingObject;
            const r = this.renderer!;
            r.controls.navigation.deactivate();
            r.events.on("mousemove", this._onDrag, this);
            r.events.on("lup", this._release, this);
            r.events.on("mouseleave", this._release, this);
        }
    }

    protected _onDrag(ms: IMouseState) {
        const layer = this._draggedLayer;
        if (!layer) return;

        const ground = this.planet!.getLonLatFromPixelTerrain(ms);
        if (!ground) return;

        const corners = layer.getCornersLonLat();
        corners[this._cornerIndex] = ground;
        layer.setCornersLonLat(corners);
    }

    protected _release() {
        if (!this._catchCorner) return;

        this._catchCorner = false;
        this._draggedLayer = null;
        document.body.style.cursor = "auto";

        const r = this.renderer!;
        r.events.off("mousemove", this._onDrag);
        r.events.off("lup", this._release);
        r.events.off("mouseleave", this._release);
        r.controls.navigation.activate();
    }

    protected _onMouseLeave() {
        if (!this._catchCorner) {
            document.body.style.cursor = "auto";
        }
    }

    protected _onMouseMove(ms: IMouseState) {
        let layer = ms.pickingObject;
        const p = this.planet!;
        if (!this._catchCorner) {
            // mouse isn't catching
            this._cornerIndex = -1;
            for (let i = 0; i < layer._cornersWgs84.length; i++) {
                // let ground = p.getLonLatFromPixelTerrain(ms, true);
                let ground = p.getLonLatFromPixelTerrain(ms);
                // mouse is near
                //if (ground && p.ellipsoid.getGreatCircleDistance(layer._cornersWgs84[i], ground) / p.getDistanceFromPixel(ms, true) <= 0.05) {
                if (
                    ground &&
                    p.ellipsoid.getGreatCircleDistance(layer._cornersWgs84[i], ground) / p.getDistanceFromPixel(ms) <=
                        0.05
                ) {
                    this._cornerIndex = i;
                    document.body.style.cursor = "move";
                    break;
                    // mouse is far
                } else {
                    document.body.style.cursor = "auto";
                }
            }
        }
    }
}
