import {Control, IControlParams} from "../Control";
import {Dialog, IDialogParams} from "../../ui/Dialog";
import {ToggleButton} from "../../ui/ToggleButton";
import {ElevationProfileView} from "./ElevationProfileView";
import {ElevationProfileScene} from "./ElevationProfileScene";
import {MouseNavigation} from "../MouseNavigation";

interface IElevationProfileGraphParams extends IControlParams {
}

const ICON_BUTTON_SVG = `<svg style="width: 2em; height: 2em;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M128 896v-158.293333l331.946667-191.573334 160.853333 93.866667L896 480V896H128M896 381.44l-275.2 159.146667-160.853333-92.586667L128 640v-94.293333l331.946667-191.573334 160.853333 93.866667L896 288v93.44z" fill="" /></svg>`;

export class ElevationProfileControl extends Control {

    protected _toggleBtn: ToggleButton;
    protected _dialog: Dialog<null>;
    protected _elevationProfileView: ElevationProfileView;
    protected _elevationProfileScene: ElevationProfileScene;

    constructor(options: IElevationProfileGraphParams = {}) {
        super({
            name: "ElevationProfileControl",
            ...options
        });

        this._elevationProfileScene = new ElevationProfileScene();
        this._elevationProfileView = new ElevationProfileView();

        this._dialog = new Dialog({
            title: "Elevation Profile",
            visible: false,
            resizable: true,
            useHide: true,
            top: 300,
            left: 10,
            width: 700,
            height: 200,
            minHeight: 100,
            minWidth: 100
        });

        this._toggleBtn = new ToggleButton({
            classList: ["og-map-button", "og-elevationprofile_button"],
            icon: ICON_BUTTON_SVG
        });
    }

    override oninit() {

        this._toggleBtn.appendTo(this.renderer!.div!);
        this._dialog.appendTo(this.planet!.renderer!.div!);

        this._dialog.events.on("visibility", (v: boolean) => {
            this._toggleBtn.setActive(v);
            if (v) {
                this.activate();
                this._elevationProfileView.resize();
            } else {
                this.deactivate();
            }
        });

        this._toggleBtn.events.on("change", (isActive: boolean) => {
            this._dialog.setVisibility(isActive);
        });

        this._elevationProfileView.appendTo(this._dialog.container!);

        this._elevationProfileView.model.bindPlanet(this.planet!);

        this._elevationProfileScene.events.on("change", this._onSceneChange)

    }

    protected _onSceneChange = () => {
        let points = this._elevationProfileScene.getPointsLonLat();
        this._elevationProfileView.model.collectProfile(points);
    }

    override onactivate() {
        (this.renderer!.controls.mouseNavigation as MouseNavigation).deactivateDoubleClickZoom()
        this.planet && this._elevationProfileScene.bindPlanet(this.planet);
        this.renderer && this.renderer.addNode(this._elevationProfileScene);
    }

    override ondeactivate() {
        (this.renderer!.controls.mouseNavigation as MouseNavigation).activateDoubleClickZoom()
        this.renderer && this.renderer.removeNode(this._elevationProfileScene);
        this._dialog.hide();
    }
}
