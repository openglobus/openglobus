import { beforeAll, describe, expect, it } from "vitest";
import { TimelineControl } from "../../../src/control/timeline/TimelineControl";
import { TimelineView } from "../../../src/control/timeline/TimelineView";
import { Clock } from "../../../src/Clock";
import { Sun } from "../../../src/control/Sun";
import { getSunPosition } from "../../../src/astro/earth";
import { DateToUTC } from "../../../src/astro/jd";
import * as math from "../../../src/math";

/**
 * Longitude the Sun stands above at the given julian date, degrees.
 */
function subsolarLon(jd) {
    let p = getSunPosition(jd);
    return math.norm_lon(Math.atan2(p.y, p.x) * math.DEGREES);
}

/**
 * Longitude the Sun is placed above when the timeline hands it the given date.
 */
function sunLonFor(iso, lon) {
    let sun = new Sun({ localDateTime: new Date(iso) });
    return subsolarLon(sun["_getLocalJulian"](DateToUTC(sun.localDateTime), lon));
}

/**
 * Runs oninit against the little of the renderer the timeline touches there.
 */
function initControl(control, sun) {
    let div = document.createElement("div");
    document.body.appendChild(div);

    control.planet = { sun };
    control.renderer = {
        div,
        handler: { defaultClock: new Clock() },
        topLeftContainer: () => div,
        requestRedraw: () => {}
    };
    control.oninit();

    return control;
}

describe("Timeline local time", () => {
    beforeAll(() => {
        global.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    });

    it("stands the Sun on the meridian at timeline noon, at any longitude", () => {
        for (let iso of ["2026-01-15T12:00:00Z", "2026-06-21T12:00:00Z", "2026-09-23T12:00:00Z"]) {
            for (let lon of [-179, -90, -33.5, 0, 45, 137, 179.5]) {
                let err = math.norm_lon(sunLonFor(iso, lon) - lon);
                expect(Math.abs(err), `${iso} at ${lon} degrees`).toBeLessThan(1e-6);
            }
        }
    });

    it("moves the Sun 15 degrees west by every timeline hour", () => {
        let noon = sunLonFor("2026-06-21T12:00:00Z", 30);
        let evening = sunLonFor("2026-06-21T15:00:00Z", 30);

        expect(math.norm_lon(noon - evening)).toBeCloseTo(45, 4);
    });

    it("reads localDateTime by its UTC clock, so the machine time zone does not move the Sun", () => {
        let sun = new Sun({ localDateTime: new Date(Date.UTC(2026, 5, 21, 12, 0, 0)) });
        let jd = sun["_getLocalJulian"](DateToUTC(sun.localDateTime), 45);

        expect(Math.abs(math.norm_lon(subsolarLon(jd) - 45))).toBeLessThan(1e-6);
    });

    it("takes up the local date and time the Sun already stands on", () => {
        let localDateTime = new Date(Date.UTC(2026, 7, 3, 18, 0, 0));
        let control = initControl(new TimelineControl(), new Sun({ localDateTime }));
        let model = control["_timelineView"].model;

        expect(control["_timelineView"].localTime).toBe(true);
        expect(model.current).toBe(localDateTime);
        expect(control.renderer.handler.defaultClock.getDate().getTime()).toBe(localDateTime.getTime());

        // and the marker sits in the middle of the scale rather than off it
        expect(model.currentTime - model.rangeStartTime).toBe(model.rangeEndTime - model.currentTime);
        expect(model.rangeEndTime - model.rangeStartTime).toBe(24 * 3600 * 1000);
    });

    it("leaves the timeline on the current date when the Sun has none", () => {
        let control = initControl(new TimelineControl(), new Sun());
        let model = control["_timelineView"].model;

        expect(control["_timelineView"].localTime).toBe(false);
        expect(Math.abs(model.currentTime - Date.now())).toBeLessThan(5000);
    });

    it("dispatches localtime by the checkbox", () => {
        let view = new TimelineView();
        view.appendTo(document.createElement("div"));

        let $checkbox = view.el.querySelector(".og-timeline-localtime input[type=checkbox]");
        expect($checkbox).not.toBeNull();
        expect($checkbox.checked).toBe(false);

        let dispatched = [];
        view.events.on("localtime", (isActive) => dispatched.push(isActive));

        $checkbox.click();
        $checkbox.click();

        expect(dispatched).toEqual([true, false]);
    });
});
