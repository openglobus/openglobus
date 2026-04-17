import type { Camera } from "../camera/Camera";
import { ToggleButton } from "../ui/ToggleButton";
import { Control, type IControlParams } from "./Control";

interface IOrthoSwitcherParams extends IControlParams {
    name?: string;
}

const ICON_BUTTON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="-5 -10 110 135"><path d="m89.984 13.039c-0.003906-0.1875-0.019531-0.37891-0.054687-0.5625-0.019532-0.09375-0.054688-0.18359-0.082032-0.27734-0.03125-0.097657-0.050781-0.19922-0.09375-0.29688-0.042968-0.10547-0.10156-0.19922-0.15625-0.30078-0.042968-0.078124-0.074218-0.15625-0.125-0.23047-0.11328-0.16797-0.23828-0.32422-0.38281-0.46875-0.007813-0.007813-0.015625-0.011719-0.023438-0.019532-0.13672-0.13281-0.28516-0.25391-0.44141-0.35937-0.082031-0.054688-0.17188-0.09375-0.25781-0.14063-0.089844-0.046874-0.17578-0.10547-0.26953-0.14453-0.10938-0.046875-0.22266-0.070312-0.33594-0.10156-0.078125-0.023438-0.15625-0.054688-0.23828-0.070313-0.19922-0.039062-0.40234-0.058594-0.60547-0.058594l-53.816-0.003906c-0.8125 0-1.5977 0.32422-2.1719 0.89844l-20.016 20.035c-0.55859 0.55469-0.90234 1.3242-0.90234 2.1719v53.812c0 1.6953 1.375 3.0703 3.0742 3.0703h53.812c0.84766 0 1.6172-0.34375 2.1719-0.89844l20.016-20.016c0.57812-0.57422 0.89844-1.3555 0.89844-2.1719l0.003906-53.832c0-0.011719-0.003906-0.023438-0.003906-0.035157zm-6.1406 50.797h-13.871v-29.453l13.871-13.883zm-53.832 1.8164-13.855 13.855v-43.324h13.855zm-9.5156-35.613 9.5117-9.5195v4.8867h6.1641v-9.2344-0.019531h43.328l-13.875 13.891zm49.477 39.941h9.5273l-9.5273 9.5273zm-6.1484 13.871h-43.32l13.871-13.871h24.836v-6.1445h-23.035v-27.652h27.652z"/></svg>`;

/**
 * Orthographic projection switch button.
 */
export class OrthoSwitcher extends Control {
    protected _toggleBtn: ToggleButton;

    constructor(options: IOrthoSwitcherParams = {}) {
        super({
            name: "orthoSwitcher",
            ...options
        });

        this._toggleBtn = new ToggleButton({
            classList: ["og-map-button", "og-orthoswitcher_button"],
            icon: ICON_BUTTON_SVG,
            title: "Orthographic projection"
        });
    }

    public override oninit() {
        this._toggleBtn.appendTo(this.renderer!.topLeftContainer());
        this._toggleBtn.events.on("change", this._onToggle);
        this.renderer!.events.on("projchanged", this._onProjectionChanged);
        this._toggleBtn.setActive(this.renderer!.activeCamera.isOrthographic, true);
    }

    public override onremove() {
        if (this.renderer) {
            this.renderer.events.off("projchanged", this._onProjectionChanged);
        }
        this._toggleBtn.events.off("change", this._onToggle);
        this._toggleBtn.remove();
    }

    protected _onToggle = (isActive: boolean) => {
        if (this.renderer) {
            void this.renderer.setOrthographicProjection(isActive);
        }
    };

    protected _onProjectionChanged = (camera: Camera) => {
        this._toggleBtn.setActive(camera.isOrthographic, true);
    };
}
