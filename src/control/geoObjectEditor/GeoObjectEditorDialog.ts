import {Dialog, IDialogParams} from "../../ui/Dialog";
import {GeoObjectEditorScene} from "./GeoObjectEditorScene";
import {Entity} from "../../entity/Entity";
import {Input} from "../../ui/Input";
import {Button} from "../../ui/Button";
import {Vec3} from "../../math/Vec3";
import {
    getGeoObject,
    setEntityPitch,
    setEntityYaw,
    setEntityRoll,
    setEntityScale,
    setEntityScale3v
} from "./GeoObjectEditorScene";
import {ToggleButton} from "../../ui/ToggleButton";

const ICON_LOCK_BUTTON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" id="filter-center-focus">
  <path d="M5 15H3v4c0 1.1.9 2 2 2h4v-2H5v-4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zM12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
</svg>`;

interface IGeoObjectPropertiesDialog extends IDialogParams {
    model: GeoObjectEditorScene
}

export class GeoObjectPropertiesDialog extends Dialog<GeoObjectEditorScene> {

    protected _lonView: Input;
    protected _latView: Input;
    protected _heightView: Input;

    protected _xView: Input;
    protected _yView: Input;
    protected _zView: Input;

    protected _pitchView: Input;
    protected _yawView: Input;
    protected _rollView: Input;

    protected _scaleView: Input;
    protected _scaleXView: Input;
    protected _scaleYView: Input;
    protected _scaleZView: Input;

    protected _groundBtn: Button;

    constructor(params: IGeoObjectPropertiesDialog) {
        super({
            title: "GeoObject Properties",
            visible: false,
            resizable: true,
            useHide: true,
            top: 25,
            right: 85,
            width: 252,
            height: 380,
            minHeight: 100,
            minWidth: 100,
            model: params.model
        });

        this._lonView = new Input({
            label: "Lon",
            type: "number",
            min: -180,
            max: 180,
            maxFixed: 10
        });

        this._latView = new Input({
            label: "Lat",
            type: "number",
            min: -90,
            max: 90,
            maxFixed: 10
        });

        this._heightView = new Input({
            label: "Height",
            type: "number",
            maxFixed: 4
        });

        this._xView = new Input({
            label: "X",
            type: "number",
            maxFixed: 10
        });

        this._yView = new Input({
            label: "Y",
            type: "number",
        });

        this._zView = new Input({
            label: "Z",
            type: "number",
        });

        this._pitchView = new Input({
            label: "Pitch",
            type: "number",
            maxFixed: 2
        });

        this._yawView = new Input({
            label: "Yaw",
            type: "number",
            maxFixed: 2
        });

        this._rollView = new Input({
            label: "Roll",
            type: "number",
            maxFixed: 2
        });

        this._scaleView = new Input({
            label: "Scale",
            type: "number",
            maxFixed: 2
        });

        this._scaleXView = new Input({
            label: "Scale X",
            type: "number",
            maxFixed: 2
        });

        this._scaleYView = new Input({
            label: "Scale Y",
            type: "number",
            maxFixed: 2
        });

        this._scaleZView = new Input({
            label: "Scale Z",
            type: "number",
            maxFixed: 2
        });

        this._groundBtn = new Button({
            text: "Put ground",
            title: "Put on the ground",
            name: "ground",
            classList: ["og-editor-ground_button"]
        });
    }

    public override render(params: any): this {
        super.render(params);

        this._initSceneEvents();

        let $toolbar = document.createElement("div");
        $toolbar.classList.add("og-editor_toolbar");
        this.container?.appendChild($toolbar);

        let cameraLockBtn = new ToggleButton({
            classList: ["og-editor_toolbar-button"],
            icon: ICON_LOCK_BUTTON_SVG,
            title: "Lock/Unlock camera view"
        });
        cameraLockBtn.appendTo($toolbar);

        cameraLockBtn.events.on("change", (isActive: boolean) => {
            if (isActive) {
                this.model.lockView();
            } else {
                this.model.unlockView();
            }
        });

        this.events.on("visibility", (vis: boolean) => {
            if (!vis) {
                cameraLockBtn.events.stopPropagation();
                cameraLockBtn.setActive(false);
            }
        })

        this.events.on("visibility", this._onVisibility);

        if (this.model.planet) {
            this._lonView.appendTo(this.container!);
            this._latView.appendTo(this.container!);
            this._heightView.appendTo(this.container!);
        }
        this._xView.appendTo(this.container!);
        this._yView.appendTo(this.container!);
        this._zView.appendTo(this.container!);

        this._pitchView.appendTo(this.container!);
        this._yawView.appendTo(this.container!);
        this._rollView.appendTo(this.container!);

        this._scaleView.appendTo(this.container!);
        this._scaleXView.appendTo(this.container!);
        this._scaleYView.appendTo(this.container!);
        this._scaleZView.appendTo(this.container!);

        if (this.model.planet) {
            this._groundBtn.appendTo(this.container!);
        }

        this._lonView.events.on("change", this._onChangeLon);
        this._latView.events.on("change", this._onChangeLat);
        this._xView.events.on("change", this._onChangeX);
        this._yView.events.on("change", this._onChangeY);
        this._zView.events.on("change", this._onChangeZ);
        this._heightView.events.on("change", this._onChangeHeight);
        this._pitchView.events.on("change", this._onChangePitch);
        this._yawView.events.on("change", this._onChangeYaw);
        this._rollView.events.on("change", this._onChangeRoll);
        this._scaleView.events.on("change", this._onChangeScale);
        this._scaleXView.events.on("change", this._onChangeScaleX);
        this._scaleYView.events.on("change", this._onChangeScaleY);
        this._scaleZView.events.on("change", this._onChangeScaleZ);

        this._groundBtn.appendTo(this.container!);

        this._groundBtn.events.on("click", this._onGround);

        return this;
    }

    protected _onVisibility = (vis: boolean) => {
        this.model.setVisibility(vis);
    }

    public override remove(): void {
        super.remove();
        this._clearSceneEvents();
    }

    protected _initSceneEvents() {
        this.model.events.on("select", this._onSelect);
        this.model.events.on("unselect", this._onUnselect);
        this.model.events.on("position", this._onPosition);
        this.model.events.on("pitch", this._onPitch);
        this.model.events.on("yaw", this._onYaw);
        this.model.events.on("roll", this._onRoll);
    }

    protected _clearSceneEvents() {
        this.model.events.off("select", this._onSelect);
        this.model.events.off("unselect", this._onUnselect);
        this.model.events.off("position", this._onPosition);
        this.model.events.off("pitch", this._onPitch);
        this.model.events.off("yaw", this._onYaw);
        this.model.events.off("roll", this._onRoll);
    }

    protected _onSelect = (entity: Entity) => {
        this.show();
        this._refresh(entity);
    }

    protected _refresh(entity: Entity) {
        let ll = entity.getLonLat();
        this._lonView.value = ll.lon;
        this._latView.value = ll.lat;
        this._heightView.value = ll.height;

        // let cart = entity.getCartesian();
        // this._xView.value = cart.x;
        // this._yView.value = cart.y;
        // this._zView.value = cart.z;

        let go = getGeoObject(entity);
        this._pitchView.value = go.getPitch();
        this._yawView.value = go.getYaw();
        this._rollView.value = go.getRoll();

        let scl = go.getScale();
        if ((scl.x === scl.y) && (scl.y === scl.z)) {
            this._scaleView.value = scl.x;
        } else {
            this._scaleView.value = 1;
        }

        this._scaleXView.value = scl.x;
        this._scaleYView.value = scl.y;
        this._scaleZView.value = scl.z;
    }

    public override hide() {
        super.hide();
        this.model.events.stopPropagation();
        this.model.unselect();
    }

    protected _onUnselect = (entity: Entity) => {
        this.hide();
    }

    protected _onPosition = (pos: Vec3, entity: Entity) => {

        this._lonView.events.stopPropagation();
        this._latView.events.stopPropagation();
        this._heightView.events.stopPropagation();

        let ll = entity.getLonLat();
        this._lonView.value = ll.lon;
        this._latView.value = ll.lat;
        this._heightView.value = ll.height;


        this._xView.events.stopPropagation();
        this._yView.events.stopPropagation();
        this._zView.events.stopPropagation();

        let cart = entity.getCartesian();
        this._xView.value = cart.x;
        this._yView.value = cart.y;
        this._zView.value = cart.z;
    }

    protected _onPitch = (a: number, entity: Entity) => {
        this._pitchView.events.stopPropagation();
        this._pitchView.value = getGeoObject(entity).getPitch();
    }

    protected _onYaw = (a: number, entity: Entity) => {
        this._yawView.events.stopPropagation();
        this._yawView.value = getGeoObject(entity).getYaw();
    }

    protected _onRoll = (a: number, entity: Entity) => {
        this._rollView.events.stopPropagation();
        this._rollView.value = getGeoObject(entity).getRoll();
    }

    protected _onChangeLon = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let ll = entity.getLonLat();
            entity.setLonLat2(parseFloat(val), ll.lat, ll.height);
        }
    }

    protected _onChangeLat = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let ll = entity.getLonLat();
            entity.setLonLat2(ll.lon, parseFloat(val), ll.height);
        }
    }

    protected _onChangeHeight = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let ll = entity.getLonLat();
            entity.setLonLat2(ll.lon, ll.lat, parseFloat(val));
        }
    }

    protected _onChangeX = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let cart = entity.getCartesian();
            entity.setCartesian(parseFloat(val), cart.y, cart.z);
        }
    }

    protected _onChangeY = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let cart = entity.getCartesian();
            entity.setCartesian(cart.x, parseFloat(val), cart.z);
        }
    }

    protected _onChangeZ = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let cart = entity.getCartesian();
            entity.setLonLat2(cart.x, cart.y, parseFloat(val));
        }
    }

    protected _onChangePitch = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            setEntityPitch(entity, parseFloat(val));
        }
    }
    protected _onChangeYaw = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            setEntityYaw(entity, parseFloat(val));
        }
    }
    protected _onChangeRoll = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            setEntityRoll(entity, parseFloat(val));
        }
    }
    protected _onChangeScale = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let s = parseFloat(val);
            setEntityScale(entity, s);
            this._scaleXView.events.stopPropagation();
            this._scaleXView.value = s;
            this._scaleYView.events.stopPropagation();
            this._scaleYView.value = s;
            this._scaleZView.events.stopPropagation();
            this._scaleZView.value = s;
        }
    }
    protected _onChangeScaleX = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let s = getGeoObject(entity).getScale();
            setEntityScale3v(entity, new Vec3(parseFloat(val), s.y, s.z));
        }
    }
    protected _onChangeScaleY = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let s = getGeoObject(entity).getScale();
            setEntityScale3v(entity, new Vec3(s.x, parseFloat(val), s.z));
        }
    }
    protected _onChangeScaleZ = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let s = getGeoObject(entity).getScale();
            setEntityScale3v(entity, new Vec3(s.x, s.y, parseFloat(val)));
        }
    }

    protected _onGround = () => {
        let entity = this.model.getSelectedEntity();
        if (entity && this.model.planet) {
            if (this.model.planet.terrain) {
                this.model.planet.terrain.getHeightAsync(entity.getLonLat(), (height: number) => {
                    this._heightView.value = height;
                });
            } else {
                this._heightView.value = 0;
            }
        }
    }
}