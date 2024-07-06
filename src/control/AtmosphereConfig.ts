import {Control, IControlParams} from "./Control";
import {Dialog} from '../ui/Dialog';
import {Slider} from "../ui/Slider";
import {Sun} from "./Sun";
import {ToggleButton} from "../ui/ToggleButton";
import {View} from '../ui/View';
import {Atmosphere} from "./Atmosphere";
import {Color} from "../ui/Color";

interface IAtmosphereConfigParams extends IControlParams {

}

const TEMPLATE =
    `<div class="og-atmosphere">
         
         <div class="og-option og-atmosphere-opacity">
         </div>
                  
        <div class="og-lighting-emptyline"></div>
       
    </div>`;

const ICON_BUTTON_SVG = `<?xml version="1.0" encoding="utf-8"?><!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
<svg width="800px" height="800px" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path fill="#000000" d="M135.688 18.5c-6.798 74.842-23.842 85.39-107.907 59.656 84.85 52.022 73.57 64.954-6.843 96.938 87.743-10.27 103.29 4.89 70.75 87.594 17.805-27.56 32.5-44.498 46.282-54.47-11.813 28.26-18.345 59.274-18.345 91.813 0 84.184 43.71 157.96 109.656 200.376-41.624-43.834-67.686-102.7-67.686-167.875 0-134.923 109.45-244.405 244.375-244.405 30.92 0 60.76 5.762 88 16.25-38.584-26.87-85.517-42.625-136.064-42.625-55.257 0-106.14 18.802-146.562 50.375 4.627-18.783 17.39-38.073 41.03-60.906C190.18 90.942 153.53 95.634 135.69 18.5zm10.03 77.188c5.67.002 11.428 1.247 16.876 3.874 14.506 6.998 22.72 21.81 22 36.938-10.26 10.87-19.507 22.696-27.594 35.344-9.035 2.753-19.075 2.27-28.25-2.156-19.37-9.343-27.5-32.6-18.156-51.97 6.715-13.92 20.638-22.036 35.125-22.03z"/></svg>`;

/**
 * Helps to set up atmosphere parameters.
 */
export class AtmosphereConfig extends Control {
    protected _toggleBtn: ToggleButton;
    protected _dialog: Dialog<null>;
    protected _panel: View<null>;

    constructor(options: IAtmosphereConfigParams = {}) {
        super(options);

        this._toggleBtn = new ToggleButton({
            classList: ["og-map-button", "og-atmosphere_button"],
            icon: ICON_BUTTON_SVG
        });

        this._dialog = new Dialog({
            title: "Atmosphere Parameters",
            visible: false,
            useHide: true,
            top: 60,
            left: 60,
            width: 600
        });

        this._dialog.events.on("visibility", (v: boolean) => {
            this._toggleBtn.setActive(v);
        });

        this._panel = new View({
            template: TEMPLATE
        });
    }

    public override oninit() {

        this._toggleBtn.appendTo(this.renderer!.div!);
        this._dialog.appendTo(this.renderer!.div!);
        this._panel.appendTo(this._dialog.container!);

        this._toggleBtn.events.on("change", (isActive: boolean) => {
            this._dialog.setVisibility(isActive);
        });
    }

    protected _update() {

    }
}
