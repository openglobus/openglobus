import {Control, IControlParams} from "./Control";
import {Dialog} from "../ui/Dialog";
import {Layer} from "../layer/Layer";
import {ToggleButton} from "../ui/ToggleButton";

interface ILayerSwitcherParams extends IControlParams {

}

const ICON_BUTTON_SVG = `<?xml version="1.0" encoding="utf-8"?>
<!-- Svg Vector Icons : http://www.onlinewebfonts.com/icon -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 1000 1000" enable-background="new 0 0 1000 1000" xml:space="preserve">
<metadata> Svg Vector Icons : http://www.onlinewebfonts.com/icon </metadata>
<g><path d="M500,573.5c-3.2,0-6.5-0.6-9.5-1.9L25,375.6c-9.1-3.8-15-12.7-15-22.6s5.9-18.8,15-22.6l465.5-196c6.1-2.5,12.9-2.5,19,0l465.5,196c9.1,3.8,15,12.7,15,22.6s-5.9,18.8-15,22.6l-465.5,196C506.5,572.9,503.2,573.5,500,573.5L500,573.5z M97.6,353L500,522.4L902.4,353L500,183.6L97.6,353L97.6,353z"/><path d="M500,720.5c-3.2,0-6.5-0.6-9.5-1.9L25,522.6c-12.4-5.2-18.3-19.6-13.1-32.1c5.2-12.5,19.6-18.3,32.1-13.1l456,192l456-192c12.4-5.2,26.9,0.6,32.1,13.1s-0.6,26.9-13.1,32.1l-465.5,196C506.5,719.9,503.2,720.5,500,720.5L500,720.5z"/><path d="M500,867.5c-3.2,0-6.5-0.6-9.5-1.9L25,669.6c-12.4-5.2-18.3-19.6-13.1-32.1c5.2-12.5,19.6-18.3,32.1-13.1l456,192l456-192c12.4-5.2,26.9,0.6,32.1,13.1c5.2,12.5-0.6,26.8-13.1,32.1l-465.5,196C506.5,866.9,503.2,867.5,500,867.5L500,867.5z"/></g>
</svg>`;

/**
 * Advanced :) layer switcher, includes base layers, overlays, geo images etc. groups.
 * Double click for zoom, drag-and-drop to change zIndex
 */
export class LayerSwitcher extends Control {
    public dialog: Dialog<null>;
    protected _menuBtn: ToggleButton;

    constructor(options: ILayerSwitcherParams = {}) {
        super({
            name: "LayerSwitcher",
            ...options
        });

        this.dialog = new Dialog({
            title: "Layer Switcher",
            top: 15,
            useHide: true,
            visible: false,
            width: 200
        });

        this._menuBtn = new ToggleButton({
            classList: ["og-map-button", "og-layerswitcher_button"],
            icon: ICON_BUTTON_SVG
        });
    }

    override oninit() {

        this.dialog.appendTo(this.planet!.renderer!.div as HTMLElement);

        this.dialog.setPosition((this.planet!.renderer!.div!.clientWidth as number) - this.dialog.width - 67)

        this.dialog.events.on("visibility", (v: boolean) => {
            this._menuBtn.setActive(v);
        });

        this.planet!.events.on("layeradd", this.addNewLayer, this)
        this.planet!.events.on("layerremove", this.removeLayer, this)
    }

    public addNewLayer = (layer: Layer) => {

    }

    public removeLayer = (layer: Layer) => {

    }

    override onactivate() {

    }

    override ondeactivate() {
        this.dialog.hide();
    }

}
