'use strict';

import { Control } from '../Control.js';
import { TimelineView } from './TimelineView.js';
import { Dialog } from "../../ui/Dialog.js";

function addHours(date, hours) {
    const temp = new Date(date);
    temp.setHours(temp.getHours() + hours);
    return temp;
}

class TimelineControl extends Control {
    constructor(options = {}) {
        if (!options.name || options.name === "") {
            options.name = "timeline";
        }
        super(options);

        this.planet = null;

        let currentDate = new Date();
        let startDate = addHours(currentDate, -12), endDate = addHours(currentDate, 12);

        this._timelineView = new TimelineView({
            width: 0, rangeStart: startDate, rangeEnd: endDate
        });
    }

    oninit() {

        let dialog = new Dialog({
            title: "Timeline",
            useHide: true,
            width: 600,
            height: 90,
            appendTo: document.body
        });

        this._timelineView.appendTo(dialog.container);
        this._timelineView.setWidth(600);
        this._timelineView.on("setcurrent", (d) => {
            this.renderer.handler.defaultClock.setDate(d);
        });

        this._timelineView.on("startdrag", () => {
            this.renderer.controls.mouseNavigation.deactivate();
        });

        this._timelineView.on("stopdrag", () => {
            this.renderer.controls.mouseNavigation.activate();
        });

        this._timelineView.on("startdragcurrent", () => {
            this.renderer.controls.mouseNavigation.deactivate();
        });

        this._timelineView.on("stopdragcurrent", () => {
            this.renderer.controls.mouseNavigation.activate();
        });

    }
}

export { TimelineControl };