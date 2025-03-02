import {Dialog, type IDialogParams} from "../../ui/Dialog";
import {GeoObjectEditorScene} from "./GeoObjectEditorScene";
import {Entity} from "../../entity/Entity";
import {Input} from "../../ui/Input";
import {Checkbox} from "../../ui/Checkbox";
import {Button} from "../../ui/Button";
import {Vec3} from "../../math/Vec3";
import {ToggleButton} from "../../ui/ToggleButton";
import {DEGREES, RADIANS} from "../../math";

const ICON_LOCK_BUTTON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" id="filter-center-focus">
  <path d="M5 15H3v4c0 1.1.9 2 2 2h4v-2H5v-4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zM12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
</svg>`;

interface IGeoObjectPropertiesDialog extends IDialogParams {
    model: GeoObjectEditorScene
}

export class GeoObjectPropertiesDialog extends Dialog<GeoObjectEditorScene> {

    protected _relativePositionView: Checkbox;

    protected _lonView: Input;
    protected _latView: Input;
    protected _heightView: Input;

    protected _xView: Input;
    protected _yView: Input;
    protected _zView: Input;

    protected _absXView: Input;
    protected _absYView: Input;
    protected _absZView: Input;

    protected _pitchView: Input;
    protected _yawView: Input;
    protected _rollView: Input;

    protected _absolutePitchView: Input;
    protected _absoluteYawView: Input;
    protected _absoluteRollView: Input;

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
            height: 480,
            minHeight: 100,
            minWidth: 100,
            model: params.model
        });

        this._relativePositionView = new Checkbox({
            label: "Relative position"
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

        this._absXView = new Input({
            label: "Absolute X",
            type: "number",
            maxFixed: 10
        });

        this._absYView = new Input({
            label: "Absolute Y",
            type: "number",
        });

        this._absZView = new Input({
            label: "Absolute Z",
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

        this._absolutePitchView = new Input({
            label: "Absolute pitch",
            type: "number",
            maxFixed: 2
        });

        this._absoluteYawView = new Input({
            label: "Absolute yaw",
            type: "number",
            maxFixed: 2
        });

        this._absoluteRollView = new Input({
            label: "Absolute roll",
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
            text: "Ground",
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

        this._relativePositionView.appendTo(this.container!);

        if (this.model.planet) {
            this._lonView.appendTo(this.container!);
            this._latView.appendTo(this.container!);
            this._heightView.appendTo(this.container!);
        }
        this._xView.appendTo(this.container!);
        this._yView.appendTo(this.container!);
        this._zView.appendTo(this.container!);

        this._absXView.appendTo(this.container!);
        this._absYView.appendTo(this.container!);
        this._absZView.appendTo(this.container!);

        this._pitchView.appendTo(this.container!);
        this._yawView.appendTo(this.container!);
        this._rollView.appendTo(this.container!);

        this._absolutePitchView.appendTo(this.container!);
        this._absoluteYawView.appendTo(this.container!);
        this._absoluteRollView.appendTo(this.container!);

        this._scaleView.appendTo(this.container!);
        this._scaleXView.appendTo(this.container!);
        this._scaleYView.appendTo(this.container!);
        this._scaleZView.appendTo(this.container!);

        if (this.model.planet) {
            this._groundBtn.appendTo(this.container!);
        }

        this._relativePositionView.events.on("change", this._onChangeRelativePosition);

        this._lonView.events.on("change", this._onChangeLon);
        this._latView.events.on("change", this._onChangeLat);
        this._heightView.events.on("change", this._onChangeHeight);

        this._xView.events.on("change", this._onChangeX);
        this._yView.events.on("change", this._onChangeY);
        this._zView.events.on("change", this._onChangeZ);

        this._absXView.events.on("change", this._onChangeAbsoluteX);
        this._absYView.events.on("change", this._onChangeAbsoluteY);
        this._absZView.events.on("change", this._onChangeAbsoluteZ);

        this._pitchView.events.on("change", this._onChangePitch);
        this._yawView.events.on("change", this._onChangeYaw);
        this._rollView.events.on("change", this._onChangeRoll);

        this._absolutePitchView.events.on("change", this._onChangeAbsolutePitch);
        this._absoluteYawView.events.on("change", this._onChangeAbsoluteYaw);
        this._absoluteRollView.events.on("change", this._onChangeAbsoluteRoll);

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

        if (!entity.parent) {
            this._relativePositionView.disabled = true;
        } else {
            this._relativePositionView.disabled = false;
        }
        //this._relativePositionView.stopPropagation();
        this._relativePositionView.checked = entity.relativePosition;

        let ll = entity.getLonLat();
        this._lonView.stopPropagation();
        this._latView.stopPropagation();
        this._heightView.stopPropagation();
        this._lonView.value = ll.lon;
        this._latView.value = ll.lat;
        this._heightView.value = ll.height;

        let cart = entity.getCartesian();
        this._xView.stopPropagation();
        this._yView.stopPropagation();
        this._zView.stopPropagation();
        this._xView.value = cart.x;
        this._yView.value = cart.y;
        this._zView.value = cart.z;

        cart = entity.getAbsoluteCartesian();
        this._absXView.stopPropagation();
        this._absYView.stopPropagation();
        this._absZView.stopPropagation();
        this._absXView.value = cart.x;
        this._absYView.value = cart.y;
        this._absZView.value = cart.z;

        this._pitchView.stopPropagation();
        this._yawView.stopPropagation();
        this._rollView.stopPropagation();
        this._pitchView.value = entity.getPitch() * DEGREES;
        this._yawView.value = entity.getYaw() * DEGREES;
        this._rollView.value = entity.getRoll() * DEGREES;

        this._absolutePitchView.stopPropagation();
        this._absoluteYawView.stopPropagation();
        this._absoluteRollView.stopPropagation();
        this._absolutePitchView.value = entity.getAbsolutePitch() * DEGREES;
        this._absoluteYawView.value = entity.getAbsoluteYaw() * DEGREES;
        this._absoluteRollView.value = entity.getAbsoluteRoll() * DEGREES;

        this._scaleView.stopPropagation();
        let scl = entity.getScale();
        if ((scl.x === scl.y) && (scl.y === scl.z)) {
            this._scaleView.value = scl.x;
        } else {
            this._scaleView.value = 1;
        }

        this._scaleXView.stopPropagation();
        this._scaleYView.stopPropagation();
        this._scaleZView.stopPropagation();
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

    protected _onChangeRelativePosition = (checked: boolean) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            entity.relativePosition = checked;
            this._refresh(entity);
        }
    }

    protected _onPosition = (pos: Vec3, entity: Entity) => {
        this._refresh(entity);
    }

    protected _onPitch = (a: number, entity: Entity) => {
        this._pitchView.stopPropagation();
        this._pitchView.value = entity.getPitch() * DEGREES;

        this._absolutePitchView.stopPropagation();
        this._absolutePitchView.value = entity.getAbsolutePitch() * DEGREES;
    }

    protected _onYaw = (a: number, entity: Entity) => {
        this._yawView.stopPropagation();
        this._yawView.value = entity.getYaw() * DEGREES;

        this._absoluteYawView.stopPropagation();
        this._absoluteYawView.value = entity.getAbsoluteYaw() * DEGREES;
    }

    protected _onRoll = (a: number, entity: Entity) => {
        this._rollView.stopPropagation();
        this._rollView.value = entity.getRoll() * DEGREES;

        this._absoluteRollView.stopPropagation();
        this._absoluteRollView.value = entity.getAbsoluteRoll() * DEGREES;
    }

    protected _onChangeLon = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let ll = entity.getLonLat();
            entity.setLonLat2(parseFloat(val), ll.lat, ll.height);
            this._refresh(entity);
        }
    }

    protected _onChangeLat = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let ll = entity.getLonLat();
            entity.setLonLat2(ll.lon, parseFloat(val), ll.height);
            this._refresh(entity);
        }
    }

    protected _onChangeHeight = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let ll = entity.getLonLat();
            entity.setLonLat2(ll.lon, ll.lat, parseFloat(val));
            this._refresh(entity);
        }
    }

    protected _onChangeX = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let cart = entity.getCartesian();
            entity.setCartesian(parseFloat(val), cart.y, cart.z);
            this._refresh(entity);
        }
    }

    protected _onChangeY = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let cart = entity.getCartesian();
            entity.setCartesian(cart.x, parseFloat(val), cart.z);
            this._refresh(entity);
        }
    }

    protected _onChangeZ = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let cart = entity.getCartesian();
            entity.setCartesian(cart.x, cart.y, parseFloat(val));
            this._refresh(entity);
        }
    }

    protected _onChangeAbsoluteX = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let cart = entity.getAbsoluteCartesian();
            entity.setAbsoluteCartesian(parseFloat(val), cart.y, cart.z);
            this._refresh(entity);
        }
    }

    protected _onChangeAbsoluteY = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let cart = entity.getAbsoluteCartesian();
            entity.setAbsoluteCartesian(cart.x, parseFloat(val), cart.z);
            this._refresh(entity);
        }
    }

    protected _onChangeAbsoluteZ = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let cart = entity.getAbsoluteCartesian();
            entity.setAbsoluteCartesian(cart.x, cart.y, parseFloat(val));
            this._refresh(entity);
        }
    }

    protected _onChangePitch = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            entity.setPitch(parseFloat(val) * RADIANS);
            this._refresh(entity);
        }
    }

    protected _onChangeYaw = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            entity.setYaw(parseFloat(val) * RADIANS);
            this._refresh(entity);

        }
    }

    protected _onChangeRoll = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            entity.setRoll(parseFloat(val) * RADIANS);
            this._refresh(entity);
        }
    }

    protected _onChangeAbsolutePitch = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            entity.setAbsolutePitch(parseFloat(val) * RADIANS);
            this._refresh(entity);
        }
    }

    protected _onChangeAbsoluteYaw = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            entity.setAbsoluteYaw(parseFloat(val) * RADIANS);
            this._refresh(entity);
        }
    }

    protected _onChangeAbsoluteRoll = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            entity.setAbsoluteRoll(parseFloat(val) * RADIANS);
            this._refresh(entity);
        }
    }

    protected _onChangeScale = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let s = parseFloat(val);
            entity.setScale(s);
            this._scaleXView.stopPropagation();
            this._scaleYView.stopPropagation();
            this._scaleZView.stopPropagation();
            this._scaleXView.value = s;
            this._scaleYView.value = s;
            this._scaleZView.value = s;
        }
    }
    protected _onChangeScaleX = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let s = entity.getScale();
            entity.setScale3v(new Vec3(parseFloat(val), s.y, s.z));
        }
    }
    protected _onChangeScaleY = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let s = entity.getScale();
            entity.setScale3v(new Vec3(s.x, parseFloat(val), s.z));
        }
    }
    protected _onChangeScaleZ = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let s = entity.getScale();
            entity.setScale3v(new Vec3(s.x, s.y, parseFloat(val)));
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