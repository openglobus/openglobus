import {Control, IControlParams} from "./Control";
import {Dialog} from "../ui/Dialog";
import {Layer} from "../layer/Layer";
import {ToggleButton} from "../ui/ToggleButton";
import {IViewParams, View} from "../ui/View";
import {stringTemplate} from "../utils/shared";

interface ILayerSwitcherParams extends IControlParams {

}

const ICON_BUTTON_SVG = `<?xml version="1.0" encoding="utf-8"?>
<!-- Svg Vector Icons : http://www.onlinewebfonts.com/icon -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 1000 1000" enable-background="new 0 0 1000 1000" xml:space="preserve">
<metadata> Svg Vector Icons : http://www.onlinewebfonts.com/icon </metadata>
<g><path d="M500,573.5c-3.2,0-6.5-0.6-9.5-1.9L25,375.6c-9.1-3.8-15-12.7-15-22.6s5.9-18.8,15-22.6l465.5-196c6.1-2.5,12.9-2.5,19,0l465.5,196c9.1,3.8,15,12.7,15,22.6s-5.9,18.8-15,22.6l-465.5,196C506.5,572.9,503.2,573.5,500,573.5L500,573.5z M97.6,353L500,522.4L902.4,353L500,183.6L97.6,353L97.6,353z"/><path d="M500,720.5c-3.2,0-6.5-0.6-9.5-1.9L25,522.6c-12.4-5.2-18.3-19.6-13.1-32.1c5.2-12.5,19.6-18.3,32.1-13.1l456,192l456-192c12.4-5.2,26.9,0.6,32.1,13.1s-0.6,26.9-13.1,32.1l-465.5,196C506.5,719.9,503.2,720.5,500,720.5L500,720.5z"/><path d="M500,867.5c-3.2,0-6.5-0.6-9.5-1.9L25,669.6c-12.4-5.2-18.3-19.6-13.1-32.1c5.2-12.5,19.6-18.3,32.1-13.1l456,192l456-192c12.4-5.2,26.9,0.6,32.1,13.1c5.2,12.5-0.6,26.8-13.1,32.1l-465.5,196C506.5,866.9,503.2,867.5,500,867.5L500,867.5z"/></g>
</svg>`;


const TEMPLATE =
    `<div class="og-layerSwitcher">
      <div class="og-layerSwitcher__title">Base Layers</div>
      <div class="og-layerSwitcher__list og-layerSwitcher__baseLayers"></div>        
        
      <div class="og-layerSwitcher__title">Overlays</div>
      <div class="og-layerSwitcher__list og-layerSwitcher__overlays"></div>
         
    </div>`;

const LAYER_BUTTON_TEMPLATE =
    `<button title={title} class="og-layerSwitcher__layerButton">{icon}<div class="og-layerSwitcher__name">{name}</div></button>`;

class LayerButtonView extends View<Layer> {
    constructor(params: IViewParams) {
        super({
            template: stringTemplate(LAYER_BUTTON_TEMPLATE, {
                title: params.model.name,
                name: params.model.name,
                icon: params.model.icon
            }),
            ...params
        });
    }

    public override render(params?: any): this {
        super.render(params);
        this.model.events.on("visibilitychange", this._onVisibilityChange);
        this._onVisibilityChange(this.model);
        this.el!.addEventListener("click", this._onClick);
        return this;
    }

    protected _onVisibilityChange = (layer: Layer) => {
        if (this.el) {
            if (this.model.getVisibility()) {
                this.el.classList.add("og-layerSwitcher__visible");
            } else {
                this.el.classList.remove("og-layerSwitcher__visible");
            }
        }
    }

    protected _onClick = () => {
        this.model.setVisibility(true);
    }

    public override remove() {
        super.remove();
        this.model.events.off("visibilitychange", this._onVisibilityChange);
    }
}

/**
 * Advanced :) layer switcher, includes base layers, overlays, geo images etc. groups.
 * Double click for zoom, drag-and-drop to change zIndex
 */
export class LayerSwitcher extends Control {
    protected _dialog: Dialog<null>;
    protected _toggleBtn: ToggleButton;
    protected _panel: View<null>;

    public $baseLayers: HTMLElement | null;
    public $overlays: HTMLElement | null;

    public _layerViews: LayerButtonView[];

    constructor(options: ILayerSwitcherParams = {}) {
        super({
            name: "LayerSwitcher",
            ...options
        });

        this._dialog = new Dialog({
            title: "Layer Switcher",
            top: 15,
            useHide: true,
            visible: false,
            width: 300,
            maxHeight: 500
        });

        this._panel = new View({
            template: TEMPLATE
        });

        this._toggleBtn = new ToggleButton({
            classList: ["og-map-button", "og-layerSwitcher_button"],
            icon: ICON_BUTTON_SVG
        });

        this.$baseLayers = null;
        this.$overlays = null;

        this._layerViews = [];
    }

    override oninit() {

        this._toggleBtn.appendTo(this.renderer!.div!);
        this._dialog.appendTo(this.planet!.renderer!.div!);
        this._panel.appendTo(this._dialog.container!);

        this.$baseLayers = this._panel.el!.querySelector(".og-layerSwitcher__baseLayers");
        this.$overlays = this._panel.el!.querySelector(".og-layerSwitcher__overlays");

        this._dialog.setPosition((this.planet!.renderer!.div!.clientWidth as number) - this._dialog.width - 67)

        this._dialog.events.on("visibility", (v: boolean) => {
            this._toggleBtn.setActive(v);
        });

        this._toggleBtn.events.on("change", (isActive: boolean) => {
            this._dialog.setVisibility(isActive);
        });

        this.planet!.events.on("layeradd", this.addLayer, this);
        this.planet!.events.on("layerremove", this.removeLayer, this);

        this._initLayers();
    }

    protected _initLayers() {
        let layers = this.planet!.layers;
        for (let i = 0; i < layers.length; i++) {
            this.addLayer(layers[i]);
        }
    }

    protected _createLayerButton(layer: Layer): LayerButtonView {
        return new LayerButtonView({
            model: layer
        });
    }

    public addLayer = (layer: Layer) => {
        let layerView = this._createLayerButton(layer);
        this._layerViews.push(layerView);
        if (layer.isBaseLayer()) {
            layerView.appendTo(this.$baseLayers!);
        } else {
            layerView.appendTo(this.$overlays!);
        }
    }

    public removeLayer = (layer: Layer) => {
        for (let i = 0; i < this._layerViews.length; i++) {
            let li = this._layerViews[i];
            if (li.model.isEqual(layer)) {
                li.remove();
                this._layerViews.splice(i, 1);
                break;
            }
        }
    }

    override onactivate() {

    }

    override ondeactivate() {
        this._dialog.hide();
    }

}
