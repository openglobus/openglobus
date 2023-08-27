import { Entity } from "../entity/Entity";
import { EntityCollection } from "../entity/EntityCollection";
import { Control } from "./Control";

/**
 * Frame per second(FPS) display control.
 */
export class SegmentBoundVisualization extends Control {
    _boundingSphereCollection: EntityCollection;
    constructor(options: any) {
        super(options);

        this._boundingSphereCollection = new EntityCollection();
    }

    override oninit() {
        this.planet!.addEntityCollection(this._boundingSphereCollection);

        this.renderer.events.on("draw", this._predraw, this);
        this.planet!.events.on("draw", this._draw, this);
    }

    _predraw() {
        this._boundingSphereCollection.clear();
    }

    _draw() {
        const planet = this.planet!;
        for (let i = 0; i < planet._renderedNodes.length; i++) {
            let si = planet._renderedNodes[i].segment as any;
            if (!si._sphereEntity) {
                si._sphereEntity = new Entity({
                    sphere: {
                        radius: 1,
                        color: [1, 1, 0, 0.6],
                        src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAVSURBVBhXY/z//z8DAwMTEDMwMAAAJAYDAbrboo8AAAAASUVORK5CYII="
                    }
                } as any);
            }
            si._sphereEntity.shape.setScale(si.bsphere.radius / 2);
            si._sphereEntity.shape.setPosition3v(si.bsphere.center);
            this._boundingSphereCollection.add(si._sphereEntity);
        }
    }
}

/**
 * @deprecated
 */
export function segmentBoundVisualization(options: any) {
    return new SegmentBoundVisualization(options);
}
