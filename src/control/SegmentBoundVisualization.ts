import {Entity} from "../entity/Entity";
import {EntityCollection} from "../entity/EntityCollection";
import {Control, IControlParams} from "./Control";
import {Segment} from '../segment/Segment';

interface SegmentExt extends Segment {
    _sphereEntity: Entity;
}

/**
 * Frame per second(FPS) display control.
 */
export class SegmentBoundVisualization extends Control {
    protected _boundingSphereCollection: EntityCollection;

    constructor(options: IControlParams) {
        super(options);

        this._boundingSphereCollection = new EntityCollection();
    }

    public override oninit() {
        this.planet!.addEntityCollection(this._boundingSphereCollection);

        this.renderer!.events.on("draw", this._predraw, this);
        this.planet!.events.on("draw", this._draw, this);
    }

    protected _predraw() {
        this._boundingSphereCollection.clear();
    }

    protected _draw() {
        const planet = this.planet!;
        for (let i = 0; i < planet._renderedNodes.length; i++) {
            let si = planet._renderedNodes[i].segment as SegmentExt;
            if (!si._sphereEntity) {
                si._sphereEntity = new Entity({
                    billboard: {
                        //todo: replace with sphere geoObject
                    }
                });
            }
            //@todo: geoObject
            //si._sphereEntity.shape.setScale(si.bsphere.radius / 2);
            //si._sphereEntity.shape.setPosition3v(si.bsphere.center);
            this._boundingSphereCollection.add(si._sphereEntity);
        }
    }
}
