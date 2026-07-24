import { Entity } from "../../entity/Entity";
import { DEGREES, RADIANS } from "../../math";
import { Vec3 } from "../../math/Vec3";
import { Checkbox } from "../../ui/Checkbox";
import { Input } from "../../ui/Input";
import { Slider } from "../../ui/Slider";
import { TitleBarView } from "../../ui/TitleBarView";
import { View, type IViewParams } from "../../ui/View";
import { EntityEditorScene, NATIVE_MODE, YAW_MODE } from "./EntityEditorScene";

interface IEntityEditorViewParams extends IViewParams {
    model: EntityEditorScene;
    entity?: Entity;
}

const TEMPLATE = `<div class="og-editor-panel"></div>`;

export class EntityEditorView extends View<EntityEditorScene> {
    protected _entity: Entity | null;
    protected _titleBarView: TitleBarView;
    protected _bodyEl: HTMLElement | null;

    protected _relativePositionView: Checkbox;
    protected _yawModeView: Checkbox;

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
    protected _opacityView: Slider;

    constructor(params: IEntityEditorViewParams) {
        super({
            template: TEMPLATE,
            model: params.model
        });

        this._entity = params.entity || null;
        this._titleBarView = new TitleBarView({
            title: "Entity"
        });
        this._bodyEl = null;

        this._relativePositionView = new Checkbox({
            label: "Relative position"
        });

        this._yawModeView = new Checkbox({
            label: "Yaw mode"
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
            type: "number"
        });

        this._zView = new Input({
            label: "Z",
            type: "number"
        });

        this._absXView = new Input({
            label: "Absolute X",
            type: "number",
            maxFixed: 10
        });

        this._absYView = new Input({
            label: "Absolute Y",
            type: "number"
        });

        this._absZView = new Input({
            label: "Absolute Z",
            type: "number"
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

        this._opacityView = new Slider({
            label: "Opacity",
            min: 0,
            max: 1,
            value: 1
        });
    }

    public bindEntity(entity: Entity): void {
        this._entity = entity;
        this.refresh(entity);
    }

    public override render(params?: unknown): this {
        super.render(params);

        this._titleBarView.appendTo(this.el!);
        this._titleBarView.events.on("change", this._onTitleBarChange);

        this._bodyEl = document.createElement("div");
        this._bodyEl.classList.add("og-editor-panel__body");
        this.el!.appendChild(this._bodyEl);

        this._relativePositionView.appendTo(this._bodyEl);
        this._yawModeView.appendTo(this._bodyEl);

        if (this.model.planet) {
            this._lonView.appendTo(this._bodyEl);
            this._latView.appendTo(this._bodyEl);
            this._heightView.appendTo(this._bodyEl);
        }
        this._xView.appendTo(this._bodyEl);
        this._yView.appendTo(this._bodyEl);
        this._zView.appendTo(this._bodyEl);

        this._absXView.appendTo(this._bodyEl);
        this._absYView.appendTo(this._bodyEl);
        this._absZView.appendTo(this._bodyEl);

        this._pitchView.appendTo(this._bodyEl);
        this._yawView.appendTo(this._bodyEl);
        this._rollView.appendTo(this._bodyEl);

        this._absolutePitchView.appendTo(this._bodyEl);
        this._absoluteYawView.appendTo(this._bodyEl);
        this._absoluteRollView.appendTo(this._bodyEl);

        this._scaleView.appendTo(this._bodyEl);
        this._scaleXView.appendTo(this._bodyEl);
        this._scaleYView.appendTo(this._bodyEl);
        this._scaleZView.appendTo(this._bodyEl);
        this._opacityView.appendTo(this._bodyEl);

        this._relativePositionView.events.on("change", this._onChangeRelativePosition);
        this._yawModeView.events.on("change", this._onChangeYawMode);

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
        this._opacityView.events.on("change", this._onChangeOpacity);

        this.refresh();

        return this;
    }

    public refresh(entity: Entity | null = this._entity): void {
        if (!entity) return;

        this._entity = entity;
        this._relativePositionView.disabled = !entity.parent;
        //this._relativePositionView.stopPropagation();
        this._relativePositionView.checked = entity.relativePosition;
        const isYawMode = this.model.editMode === YAW_MODE;
        if (this._yawModeView.checked !== isYawMode) {
            this._yawModeView.events.stopPropagation();
            this._yawModeView.checked = isYawMode;
        }

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

        this.refreshRotation(entity);

        this._scaleView.stopPropagation();
        let scl = entity.getScale();
        if (scl.x === scl.y && scl.y === scl.z) {
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

        this._opacityView.events.stopPropagation();
        this._opacityView.value = entity.getOpacity();
    }

    public refreshRotation(entity: Entity | null = this._entity): void {
        if (!entity) return;

        this._pitchView.stopPropagation();
        this._pitchView.value = entity.getPitch() * DEGREES;
        this._yawView.stopPropagation();
        this._yawView.value = entity.getYaw() * DEGREES;
        this._rollView.stopPropagation();
        this._rollView.value = entity.getRoll() * DEGREES;

        this._absolutePitchView.stopPropagation();
        this._absolutePitchView.value = entity.getAbsolutePitch() * DEGREES;
        this._absoluteYawView.stopPropagation();
        this._absoluteYawView.value = entity.getAbsoluteYaw() * DEGREES;
        this._absoluteRollView.stopPropagation();
        this._absoluteRollView.value = entity.getAbsoluteRoll() * DEGREES;
    }

    public override remove(): void {
        this._relativePositionView.remove();
        this._yawModeView.remove();
        this._lonView.remove();
        this._latView.remove();
        this._heightView.remove();
        this._xView.remove();
        this._yView.remove();
        this._zView.remove();
        this._absXView.remove();
        this._absYView.remove();
        this._absZView.remove();
        this._pitchView.remove();
        this._yawView.remove();
        this._rollView.remove();
        this._absolutePitchView.remove();
        this._absoluteYawView.remove();
        this._absoluteRollView.remove();
        this._scaleView.remove();
        this._scaleXView.remove();
        this._scaleYView.remove();
        this._scaleZView.remove();
        this._opacityView.remove();
        this._titleBarView.events.off("change", this._onTitleBarChange);
        this._titleBarView.remove();
        this._bodyEl = null;
        super.remove();
    }

    protected _onTitleBarChange = (isCollapsed: boolean): void => {
        this._bodyEl?.classList.toggle("og-editor-panel__body_collapsed", isCollapsed);
    };

    protected _onChangeRelativePosition = (checked: boolean) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            entity.relativePosition = checked;
            this.refresh(entity);
        }
    };

    protected _onChangeYawMode = (checked: boolean) => {
        this.model.editMode = checked ? YAW_MODE : NATIVE_MODE;
    };

    protected _onChangeLon = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let ll = entity.getLonLat();
            entity.setLonLat2(parseFloat(val), ll.lat, ll.height);
            this.refresh(entity);
        }
    };

    protected _onChangeLat = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let ll = entity.getLonLat();
            entity.setLonLat2(ll.lon, parseFloat(val), ll.height);
            this.refresh(entity);
        }
    };

    protected _onChangeHeight = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let ll = entity.getLonLat();
            entity.setLonLat2(ll.lon, ll.lat, parseFloat(val));
            this.refresh(entity);
        }
    };

    protected _onChangeX = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let cart = entity.getCartesian();
            entity.setCartesian(parseFloat(val), cart.y, cart.z);
            this.refresh(entity);
        }
    };

    protected _onChangeY = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let cart = entity.getCartesian();
            entity.setCartesian(cart.x, parseFloat(val), cart.z);
            this.refresh(entity);
        }
    };

    protected _onChangeZ = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let cart = entity.getCartesian();
            entity.setCartesian(cart.x, cart.y, parseFloat(val));
            this.refresh(entity);
        }
    };

    protected _onChangeAbsoluteX = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let cart = entity.getAbsoluteCartesian();
            entity.setAbsoluteCartesian(parseFloat(val), cart.y, cart.z);
            this.refresh(entity);
        }
    };

    protected _onChangeAbsoluteY = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let cart = entity.getAbsoluteCartesian();
            entity.setAbsoluteCartesian(cart.x, parseFloat(val), cart.z);
            this.refresh(entity);
        }
    };

    protected _onChangeAbsoluteZ = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let cart = entity.getAbsoluteCartesian();
            entity.setAbsoluteCartesian(cart.x, cart.y, parseFloat(val));
            this.refresh(entity);
        }
    };

    protected _onChangePitch = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            entity.setPitch(parseFloat(val) * RADIANS);
            this.refresh(entity);
        }
    };

    protected _onChangeYaw = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            entity.setYaw(parseFloat(val) * RADIANS);
            this.refresh(entity);
        }
    };

    protected _onChangeRoll = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            entity.setRoll(parseFloat(val) * RADIANS);
            this.refresh(entity);
        }
    };

    protected _onChangeAbsolutePitch = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            entity.setAbsolutePitch(parseFloat(val) * RADIANS);
            this.refresh(entity);
        }
    };

    protected _onChangeAbsoluteYaw = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            entity.setAbsoluteYaw(parseFloat(val) * RADIANS);
            this.refresh(entity);
        }
    };

    protected _onChangeAbsoluteRoll = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            entity.setAbsoluteRoll(parseFloat(val) * RADIANS);
            this.refresh(entity);
        }
    };

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
    };

    protected _onChangeScaleX = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let s = entity.getScale();
            entity.setScale3v(new Vec3(parseFloat(val), s.y, s.z));
        }
    };

    protected _onChangeScaleY = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let s = entity.getScale();
            entity.setScale3v(new Vec3(s.x, parseFloat(val), s.z));
        }
    };

    protected _onChangeScaleZ = (val: string) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            let s = entity.getScale();
            entity.setScale3v(new Vec3(s.x, s.y, parseFloat(val)));
        }
    };

    protected _onChangeOpacity = (val: number) => {
        let entity = this.model.getSelectedEntity();
        if (entity) {
            entity.setOpacity(val);
        }
    };
}
