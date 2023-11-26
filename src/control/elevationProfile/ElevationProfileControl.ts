import {Control, IControlParams} from "../Control";
import {Dialog, IDialogParams} from "../../ui/Dialog";
import {View} from "../../ui/View";
import {ToggleButton} from "../../ui/ToggleButton";
import {ElevationProfileView} from "./ElevationProfileView";
import {ElevationProfileScene} from "./ElevationProfileScene";
import {MouseNavigation} from "../MouseNavigation";
import {throttle} from "../../utils/shared";
import {ElevationProfileButtonsView} from "./ElevationProfileButtonsView";
import {PointListDialog} from "./PointListDialog";
import {GroundItem, TrackItem} from "./ElevationProfile";
import {ElevationProfileLegend} from "./ElevationProfileLegend";

const TEMPLATE =
    `<div class="og-elevationprofile__container">
      <div class="og-elevationprofile__menu"></div>
      <div class="og-elevationprofile__graph"></div>
    </div>`;

interface IElevationProfileGraphParams extends IControlParams {
}

const ICON_BUTTON_SVG = `<svg style="width: 2em; height: 2em;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M128 896v-158.293333l331.946667-191.573334 160.853333 93.866667L896 480V896H128M896 381.44l-275.2 159.146667-160.853333-92.586667L128 640v-94.293333l331.946667-191.573334 160.853333 93.866667L896 288v93.44z" fill="" /></svg>`;

export class ElevationProfileControl extends Control {

    protected _toggleBtn: ToggleButton;
    protected _dialog: Dialog<null>;
    protected _graphView: View<null>;
    protected _poiListDialog: PointListDialog;
    protected _elevationProfileView: ElevationProfileView;
    protected _elevationProfileScene: ElevationProfileScene;
    protected _elevationProfileButtonsView: ElevationProfileButtonsView;
    protected _elevationProfileLegend: ElevationProfileLegend;

    protected _collectProfileThrottled: () => void;

    constructor(options: IElevationProfileGraphParams = {}) {
        super({
            name: "ElevationProfileControl",
            ...options
        });

        this._elevationProfileScene = new ElevationProfileScene();
        this._elevationProfileView = new ElevationProfileView();
        this._elevationProfileLegend = new ElevationProfileLegend();
        this._elevationProfileButtonsView = new ElevationProfileButtonsView({
            model: this._elevationProfileView.model
        });

        this._elevationProfileView.events.on("pointer", this._onElevationProfilePointer);
        this._elevationProfileView.events.on("dblclick", this._onElevationProfileDblClick);
        this._elevationProfileView.events.on("mouseenter", this._onElevationProfileMouseEnter);
        this._elevationProfileView.events.on("mouseleave", this._onElevationProfileMouseLeave);


        this._dialog = new Dialog({
            title: "Elevation Profile",
            visible: false,
            resizable: true,
            useHide: true,
            top: 175,
            left: 65,
            width: 400,
            height: 200,
            minHeight: 100,
            minWidth: 100
        });

        this._graphView = new View({
            template: TEMPLATE
        });

        this._poiListDialog = new PointListDialog({
            model: this._elevationProfileScene
        });

        this._toggleBtn = new ToggleButton({
            classList: ["og-map-button", "og-elevationprofile_button"],
            icon: ICON_BUTTON_SVG
        });

        this._collectProfileThrottled = throttle(() => {
            let points = this._elevationProfileScene.getPointsLonLat();
            this._elevationProfileView.model.collectProfile(points);
        }, 250);
    }

    override oninit() {

        this._dialog.appendTo(this.planet!.renderer!.div!);
        this._graphView.appendTo(this._dialog.container!);

        this._toggleBtn.appendTo(this.renderer!.div!);
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

        this._elevationProfileView.appendTo(this._graphView.select(".og-elevationprofile__graph")!);
        this._elevationProfileView.model.bindPlanet(this.planet!);
        this._elevationProfileView.model.events.on("clear", () => {
            this._elevationProfileScene.clear();
            this._elevationProfileLegend.clear();
        });
        this._elevationProfileView.model.events.on("startcollecting", () => {
            this._elevationProfileScene.setPointerVisibility(false);
        });
        this._elevationProfileView.events.on("tracklength", (length: number) => {
            this._elevationProfileLegend.setTrackLength(length);
        });
        this._elevationProfileView.events.on("groundlength", (length: number) => {
            this._elevationProfileLegend.setGroundLength(length);
        });
        this._elevationProfileView.events.on("warninglength", (length: number) => {
            this._elevationProfileLegend.setWarningLength(length);
        });
        this._elevationProfileView.events.on("collisionlength", (length: number) => {
            this._elevationProfileLegend.setCollisionLength(length);
        });


        this._poiListDialog.appendTo(this.planet!.renderer!.div!);
        this._poiListDialog.events.on("visibility", (isVisible: boolean) => {
            this._elevationProfileButtonsView.pointListBtn.setActive(isVisible, true);
        });

        this._elevationProfileLegend.appendTo(this._graphView.select(".og-elevationprofile__menu")!);

        this._elevationProfileButtonsView.appendTo(this._graphView.select(".og-elevationprofile__menu")!);
        this._elevationProfileButtonsView.events.on("list", (isActive: boolean) => {
            this._poiListDialog.setVisibility(isActive);
        });
        this._elevationProfileButtonsView.events.on("location", (isActive: boolean) => {
            this._elevationProfileScene.flyExtent();
        });
        this._elevationProfileButtonsView.events.on("reset", (isActive: boolean) => {
            this._elevationProfileScene.setPointerVisibility(false);
        });


        this._elevationProfileScene.events.on("change", this._onSceneChange);
    }

    protected _onSceneChange = () => {
        this._collectProfileThrottled();
    }

    override onactivate() {
        (this.renderer!.controls.mouseNavigation as MouseNavigation).deactivateDoubleClickZoom();
        this.planet && this._elevationProfileScene.bindPlanet(this.planet);
        this.renderer && this.renderer.addNode(this._elevationProfileScene);
    }

    override ondeactivate() {
        this._poiListDialog.setVisibility(false);
        this._elevationProfileView.model.clear();
        (this.renderer!.controls.mouseNavigation as MouseNavigation).activateDoubleClickZoom();
        this.renderer && this.renderer.removeNode(this._elevationProfileScene);
        this._dialog.hide();
    }

    protected _onElevationProfilePointer = (pointerDistance: number, tp0: TrackItem, tp1: TrackItem, gp0: GroundItem, gp1: GroundItem, trackPoiIndex: number, groundPoiIndex: number, elevation: number) => {

        let lonLat0 = this._elevationProfileScene.getPointLonLat(trackPoiIndex)!;
        let lonLat1 = this._elevationProfileScene.getPointLonLat(trackPoiIndex + 1)!;

        let cart0 = this.planet!.ellipsoid.lonLatToCartesian(lonLat0),
            cart1 = this.planet!.ellipsoid.lonLatToCartesian(lonLat1);

        let d = (pointerDistance - tp0[0]) / (tp1[0] - tp0[0]);

        let dir = cart1.sub(cart0);

        this._elevationProfileScene.setPointerCartesian3v(cart0.add(dir.scale(d)), elevation);
    }

    protected _onElevationProfileDblClick = (pointerDistance: number, tp0: TrackItem, tp1: TrackItem, gp0: GroundItem, gp1: GroundItem, trackPoiIndex: number, groundPoiIndex: number, elevation: number) => {
        let lonLat0 = this._elevationProfileScene.getPointLonLat(trackPoiIndex)!;
        let lonLat1 = this._elevationProfileScene.getPointLonLat(trackPoiIndex + 1)!;

        let cart0 = this.planet!.ellipsoid.lonLatToCartesian(lonLat0),
            cart1 = this.planet!.ellipsoid.lonLatToCartesian(lonLat1);

        let d = (pointerDistance - tp0[0]) / (tp1[0] - tp0[0]);

        let dir = cart1.sub(cart0);

        let poi = cart0.add(dir.scale(d));

        this.planet!.camera.flyDistance(poi, this.planet!.camera.eye.distance(poi));
    }

    protected _onElevationProfileMouseEnter = () => {
        if (this._elevationProfileView.model.pointsReady) {
            this._elevationProfileScene.setPointerVisibility(true);
        }
    }

    protected _onElevationProfileMouseLeave = () => {

    }
}
