import {Control, type IControlParams} from "../Control";
import {Object3dManagerDialog} from "./Object3dManagerDialog";
import {Object3dCollection} from "./Object3dCollection";
import {IObject3dItem} from "./Object3dCollection";
import {Vector} from "../../layer/Vector";
import {IMouseState} from "../../renderer/RendererEvents";
import {LonLat} from "../../LonLat";
import {Entity} from "../../entity/Entity";
import {input} from "../../input/input";

export interface IObject3dManagerParams extends IControlParams {
    collection?: IObject3dItem[],
    layer?: Vector
}

export class Object3dManager extends Control {
    protected _dialog: Object3dManagerDialog;
    protected _collection: Object3dCollection;
    protected _layer: Vector | null;
    protected _currentItem: IObject3dItem | null;

    constructor(options: IObject3dManagerParams = {}) {
        super(options);

        this._layer = options.layer || null;

        this._currentItem = null;

        this._collection = new Object3dCollection({
            collection: options.collection
        });

        this._dialog = new Object3dManagerDialog({
            model: this._collection
        });
    }

    public override oninit() {
        if (this.renderer) {
            this._dialog.appendTo(this.renderer.div || document.body);
            this._dialog.events.on("select", this._onSelect);
            this.activate();
        }
    }

    public override onactivate() {
        this._dialog.show();
        this._initEvents();
    }

    public override ondeactivate() {
        this._dialog.hide();
        this._clearEvents();
    }

    protected _onSelect = (item: IObject3dItem) => {
        this._currentItem = item;
    }

    public bindLayer(layer: Vector) {
        this._layer = layer;
    }

    protected _initEvents() {
        if (this.planet && this.planet.renderer) {
            this.planet.renderer.events.on("lclick", this._onClick);
        }
    }

    protected _clearEvents() {
        if (this.planet && this.planet.renderer) {
            this.planet.renderer.events.off("lclick", this._onClick);
        }
    }

    protected _onClick = (e: IMouseState) => {
        if (!this.planet) return;
        if (!this._layer) return;
        if (!this._currentItem) return;

        let lonLat = this.planet.getLonLatFromPixelTerrain(e.pos);

        if (lonLat) {
            this.renderer!.setRelativeCenter(this.planet.camera.eye);
            if (this.renderer!.events.isKeyPressed(input.KEY_CTRL)) {
                let entity = this._createEntity(this._currentItem, lonLat);
                this._layer.add(entity);
            }
        }
    }

    protected _createEntity(item: IObject3dItem, lonLat: LonLat): Entity {

        let name = item.name;
        let scale = item.scale;

        let entity = new Entity({
            lonlat: lonLat,
            pitch: 0,
            yaw: 0,
            roll: 0,
            scale,
        });

        for (let i = 0; i < item.objects.length; i++) {
            let obj3d = item.objects[i];
            let childEntity = new Entity({
                forceGlobalPosition: true,
                forceGlobalRotation: true,
                forceGlobalScale: true,
                geoObject: {
                    tag: `${name}:${i.toString()}`,
                    object3d: obj3d
                }
            });

            entity.appendChild(childEntity);
        }

        return entity;
    }
}
