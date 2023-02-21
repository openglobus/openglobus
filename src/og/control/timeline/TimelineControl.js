'use strict';

import { Control } from '../Control.js';
import { TimelineView } from './TimelineView.js';
import { Dialog } from "../../ui/Dialog.js";
import { ToggleButton } from "../../ui/ToggleButton.js";
import { UTCtoDate } from "../../astro/jd.js";

function addHours(date, hours) {
    const temp = new Date(date);
    temp.setHours(temp.getHours() + hours);
    return temp;
}

const ICON_BUTTON_SVG = `<?xml version="1.0" encoding="utf-8"?>
<!-- Svg Vector Icons : http://www.onlinewebfonts.com/icon -->
    <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 1000 1000" enable-background="new 0 0 1000 1000" xml:space="preserve">
    <metadata> Svg Vector Icons : http://www.onlinewebfonts.com/icon </metadata>
    <g><path d="M500,10C229.4,10,10,229.4,10,500s219.4,490,490,490s490-219.4,490-490S770.6,10,500,10z M800.3,800.3c-39,39-84.5,69.7-135,91C613,913.5,557.4,924.7,500,924.7s-112.9-11.2-165.3-33.3c-50.5-21.3-95.9-52-135-91c-39-39-69.7-84.5-91-135C86.5,612.9,75.3,557.4,75.3,500s11.2-112.9,33.3-165.3c21.3-50.5,52-95.9,91-135c39-39,84.5-69.7,135-91C387.1,86.5,442.6,75.3,500,75.3s112.9,11.2,165.3,33.3c50.5,21.3,95.9,52,135,91c39,39,69.7,84.5,91,135c22.1,52.3,33.3,107.9,33.3,165.3s-11.2,112.9-33.3,165.3C869.9,715.8,839.3,761.2,800.3,800.3z"/><path d="M761.3,532.7H532.7V304c0-18.1-14.6-32.7-32.7-32.7s-32.7,14.6-32.7,32.7v261.3l0,0c0,18.1,14.6,32.7,32.7,32.7h261.3c18.1,0,32.7-14.6,32.7-32.7l0,0C794,547.3,779.4,532.7,761.3,532.7z"/></g>
</svg>`;

class TimelineControl extends Control {
    constructor(options = {}) {
        if (!options.name || options.name === "") {
            options.name = "timeline";
        }
        super(options);

        let currentDate = new Date();
        let startDate = addHours(currentDate, -12), endDate = addHours(currentDate, 12);

        this._timelineView = new TimelineView({
            rangeStart: startDate,
            rangeEnd: endDate
        });

        this._toggleBtn = new ToggleButton({
            classList: ["og-map-button", "og-timeline_button"],
            icon: ICON_BUTTON_SVG
        });

        this._dialog = new Dialog({
            title: "Timeline",
            visible: false,
            resizable: true,
            useHide: true,
            top: 10,
            left: 60,
            width: 600,
            height: 115,
            minHeight: 115,
            maxHeight: 110
        });

        this._dialog.on("visibility", (v) => {
            this._toggleBtn.setActive(v);
        });
    }

    oninit() {

        let $container = this.renderer.div;

        this._toggleBtn.appendTo($container);
        this._dialog.appendTo($container);

        this._toggleBtn.on("change", (isActive) => {
            this._dialog.setVisibility(isActive);
            if (isActive) {
                this._timelineView.resize();
            }
        });

        this._timelineView.appendTo(this._dialog.container);

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