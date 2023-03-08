"use strict";

import { Entity } from "../entity/Entity.js";
import { EntityCollection } from "../entity/EntityCollection.js";
import { Control } from "./Control.js";

/**
 * Frame per second(FPS) display control.
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class SegmentBoundVisualization extends Control {
    constructor(options) {
        super(options);

        this._boundingSphereCollection = new EntityCollection();
    }

    oninit() {
        this.planet.addEntityCollection(this._boundingSphereCollection);

        this.renderer.events.on("draw", this._predraw, this);
        this.planet.events.on("draw", this._draw, this);
    }

    _predraw() {
        this._boundingSphereCollection.clear();
    }

    _draw() {
        for (let i = 0; i < this.planet._renderedNodes.length; i++) {
            let si = this.planet._renderedNodes[i].segment;
            if (!si._sphereEntity) {
                si._sphereEntity = new Entity({
                    sphere: {
                        radius: 1,
                        color: [1, 1, 0, 0.6],
                        src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAVSURBVBhXY/z//z8DAwMTEDMwMAAAJAYDAbrboo8AAAAASUVORK5CYII="
                    }
                });
            }
            si._sphereEntity.shape.setScale(si.bsphere.radius / 2);
            si._sphereEntity.shape.setPosition3v(si.bsphere.center);
            this._boundingSphereCollection.add(si._sphereEntity);
        }
    }
}

export function segmentBoundVisualization(options) {
    return new SegmentBoundVisualization(options);
}

export { SegmentBoundVisualization };
