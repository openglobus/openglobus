import {Dialog, IDialogParams} from "../../ui/Dialog";
import {GeoObjectEditorScene} from "./GeoObjectEditorScene";
import {Entity} from "../../entity/Entity";
import {Input} from "../../ui/Input";
import {Button} from "../../ui/Button";
import {Vec3} from "../../math/Vec3";

interface IGeoObjectPropertiesDialog extends IDialogParams {
    model: GeoObjectEditorScene
}

export class GeoObjectPropertiesDialog extends Dialog<GeoObjectEditorScene> {

    protected _lonView: Input;
    protected _latView: Input;
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
            resizable: false,
            useHide: true,
            top: 175,
            left: 65,
            width: 150,
            height: 400,
            minHeight: 100,
            minWidth: 100,
            model: params.model
        });

        this._lonView = new Input({
            label: "Lon",
            type: "number",
            min: -180,
            max: 180
        });

        this._latView = new Input({
            label: "Lat",
            type: "number",
            min: -90,
            max: 90
        });

        this._pitchView = new Input({
            label: "Pitch",
            type: "number"
        });

        this._yawView = new Input({
            label: "Yaw",
            type: "number"
        });

        this._rollView = new Input({
            label: "Roll",
            type: "number"
        });

        this._scaleView = new Input({
            label: "Scale",
            type: "number"
        });

        this._scaleXView = new Input({
            label: "Scale X",
            type: "number"
        });

        this._scaleYView = new Input({
            label: "Scale Y",
            type: "number"
        });

        this._scaleZView = new Input({
            label: "Scale Z",
            type: "number"
        });

        this._groundBtn = new Button({
            text: "Ground",
            title: "Put on the ground",
            name: "ground"
        });
    }

    public override render(params: any): this {
        super.render(params);
        //this._initSceneEvents();
        this.events.on("close", this._onClose);
        this.events.on("show", this._onShow);

        this._lonView.appendTo(this.el!);
        this._latView.appendTo(this.el!);
        this._pitchView.appendTo(this.el!);
        this._yawView.appendTo(this.el!);
        this._rollView.appendTo(this.el!);
        this._scaleView.appendTo(this.el!);
        this._scaleXView.appendTo(this.el!);
        this._scaleYView.appendTo(this.el!);
        this._scaleZView.appendTo(this.el!);
        this._groundBtn.appendTo(this.el!);

        return this;
    }

    protected _onShow = () => {
        this._initSceneEvents();
    }

    protected _onClose = () => {
        this._clearSceneEvents();
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
        this._lonView.value = entity.getLonLat().lon;
        this._latView.value = entity.getLonLat().lat;
        this._pitchView.value = entity.geoObject!.getPitch();
        this._yawView.value = entity.geoObject!.getYaw();
        this._rollView.value = entity.geoObject!.getRoll();
        this._scaleXView.value = entity.geoObject!.getScale().x;
        this._scaleYView.value = entity.geoObject!.getScale().y;
        this._scaleZView.value = entity.geoObject!.getScale().z;
    }

    protected _onUnselect = (entity: Entity) => {
        this.hide();
    }

    protected _onPosition = (pos: Vec3, entity: Entity) => {
        this._lonView.value = entity.getLonLat().lon;
        this._latView.value = entity.getLonLat().lat;
    }

    protected _onPitch = (a: number, entity: Entity) => {
        this._pitchView.value = entity.geoObject!.getPitch();
    }

    protected _onYaw = (a: number, entity: Entity) => {
        this._yawView.value = entity.geoObject!.getYaw();
    }

    protected _onRoll = (a: number, entity: Entity) => {
        this._rollView.value = entity.geoObject!.getRoll();
    }
}