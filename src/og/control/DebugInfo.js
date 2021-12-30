/**
 * @module og/control/DebugInfo
 */

"use strict";

import { Control } from "./Control.js";

/**
 * Debug information
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class DebugInfo extends Control {
    /**
     * @param {Object} [options] - Control options.
     */
    constructor(options) {
        options = options || {};
        if (!options.name || options.name === "") {
            options.name = "DebugInfo";
        }
        super(options);
        this.el = null;
        this._watch = options.watch || [];
    }

    addWatches(watches) {
        for (var i = 0; i < watches.length; i++) {
            this.addWatch(watches[i]);
        }
    }

    addWatch(watch) {
        this._watch.push(watch);
        let watchEl = document.createElement("div");
        watchEl.classList.add("og-watch-line");
        watchEl.innerHTML =
            '<div class="og-watch-label">' +
            watch.label +
            '</div><div class="og-watch-value"></div>';
        watch.valEl = watchEl.querySelector(".og-watch-value");
        this.el.appendChild(watchEl);
    }

    oninit() {
        this.el = document.createElement("div");
        this.el.className = "og-debug-info";
        var temp = this._watch;
        this._watch = [];
        for (var i = 0; i < temp.length; i++) {
            this.addWatch(temp[i]);
        }
        this.renderer.div.appendChild(this.el);
        this.renderer.events.on("draw", this._frame, this);

        let p = this.planet;

        if (p) {
            this.addWatches([
                {
                    label: "Nodes count",
                    frame: () => p._renderedNodes.length
                },
                {
                    label: "createdNodes",
                    frame: () => p._createdNodesCount
                },
                {
                    label: "indexesCache",
                    frame: () => p._indexesCacheToRemoveCounter
                },
                {
                    label: "distBeforeMemClear",
                    frame: () => Math.round(p._distBeforeMemClear)
                },
                {
                    label: "maxZoom/minZoom",
                    frame: () => p.maxCurrZoom + " / " + p.minCurrZoom
                },
                {
                    label: "height/alt (km)",
                    frame: () =>
                        `<div style="width:190px">${
                            (p.camera._lonLat.height / 1000.0).toFixed(2) +
                            " / " +
                            (p.camera.getAltitude() / 1000.0).toFixed(2)
                        }</div>`
                },
                {
                    label: "cam.slope",
                    frame: () => p.camera.slope.toFixed(3)
                },
                {
                    label: "lodSize",
                    frame: () => p.lodSize.toFixed(1)
                },
                {
                    label: "deltaTime/FPS",
                    frame: () =>
                        `<div style="width:70px"><div style="width:20px; float: left;">${Math.round(
                            p.renderer.handler.deltaTime
                        )}</div> <div style="float: left">${Math.round(
                            1000.0 / p.renderer.handler.deltaTime
                        )}</div></div>`
                },
                {
                    label: "-------------------------"
                },
                {
                    label: "PlainWorker",
                    frame: () => p._plainSegmentWorker._pendingQueue.length
                },
                {
                    label: "TileLoader",
                    frame: () => p._tileLoader._loading + " " + p._tileLoader._queue.length
                },
                {
                    label: "TerrainLoader",
                    frame: () => {
                        if (p.terrain && p.terrain._loader) {
                            return (
                                p.terrain._loader._loading + " " + p.terrain._loader._queue.length
                            );
                        }
                        return "";
                    }
                },
                {
                    label: "TerrainWorker",
                    frame: () => p._terrainWorker._pendingQueue.length
                },
                {
                    label: "NormalMapCreator",
                    frame: () => p._normalMapCreator._queue.length
                }
            ]);
        }
    }

    _frame() {
        for (var i = 0; i < this._watch.length; i++) {
            var w = this._watch[i];
            w.valEl.innerHTML = w.frame ? w.frame() : "";
        }
    }
}

export function debugInfo(options) {
    return new DebugInfo(options);
}

export { DebugInfo };
