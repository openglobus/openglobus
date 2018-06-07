/**
 * @module og/control/DebugInfo
 */

'use strict';

import { Control } from './Control.js';
import { print2d } from '../utils/Shared.js';

/**
 * Debug information
 * @class
 * @extends {og.control.Control}
 * @param {Object} [options] - Control options.
 */
class DebugInfo extends Control {
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
        let watchEl = document.createElement('div');
        watchEl.classList.add("og-watch-line");
        watchEl.innerHTML = '<div class="og-watch-label">' + watch.label + '</div><div class="og-watch-value"></div>';
        watch.valEl = watchEl.querySelector(".og-watch-value");
        this.el.appendChild(watchEl);
    }

    oninit() {
        this.el = document.createElement('div');
        this.el.className = 'og-debug-info';
        var temp = this._watch;
        this._watch = [];
        for (var i = 0; i < temp.length; i++) {
            this.addWatch(temp[i]);
        }
        this.renderer.div.appendChild(this.el);
        this.renderer.events.on("draw", this._frame, this);

        let p = this.planet;

        if (p) {
            this.addWatches([{
                'label': "Nodes count",
                'frame': () => p._renderedNodes.length
            }, {
                'label': "TileLoader",
                'frame': () => p._tileLoader._loading + ' ' + p._tileLoader._queue.length
            }, {
                'label': "NormalMapCreator",
                'frame': () => p._normalMapCreator._queue.length
            }, {
                'label': "TerrainWorker",
                'frame': () => p._terrainWorker._pendingQueue.length
            }, {
                'label': "TerrainLoader",
                'frame': () => {
                    if (p.terrain && p.terrain._loader)
                        return p.terrain._loader._loading + ' ' + p.terrain._loader._queue.length;
                    else
                        return '';
                }
            }, {
                'label': "maxZoom/minZoom",
                'frame': () => p.maxCurrZoom + '/' + p.minCurrZoom
            }, {
                'label': "height/alt (km)",
                'frame': () => (p.camera._lonLat.height / 1000.0).toFixed(2) + '/' + (p.camera.getAltitude() / 1000.0).toFixed(2)
            }, {
                'label': "cam.slope",
                'frame': () => p.camera.slope.to
            }]);
        }
    }

    _frame() {
        for (var i = 0; i < this._watch.length; i++) {
            var w = this._watch[i];
            w.valEl.innerHTML = w.frame();
        }
    }
};

export function debugInfo(options) {
    return new DebugInfo(options);
};

export { DebugInfo };