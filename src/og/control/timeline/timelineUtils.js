'use strict';

import * as math from '../../math';

export function addSeconds(date, seconds) {
    return new Date(+date + seconds * 1000);
}

export function dateToStr(date, showTime = true, showMilliseconds = false) {

    let month = MONTHS[date.getMonth()],
        day = date.getUTCDate(),
        year = date.getUTCFullYear();

    if (showTime) {
        let h = date.getUTCHours().toString().padStart(2, '0'),
            m = date.getUTCMinutes().toString().padStart(2, '0'),
            s = date.getUTCSeconds().toString().padStart(2, '0');

        if (showMilliseconds) {
            let ms = date.getUTCMilliseconds().toString().padStart(3, '0');
            return `${month} ${day} ${year} ${h}:${m}:${s}.${ms}`;
        }

        return `${month} ${day} ${year} ${h}:${m}:${s}`;
    }

    return `${month} ${day} ${year}`;
}

export function createCanvasHTML() {
    return document.createElement("canvas");
}

export function getNearestTimeLeft(t, div) {
    return t - (t % div);
}

export function drawNotch(ctx, xOffset = 0, size = 10, thickness = 2, color = "white") {
    ctx.lineWidth = thickness;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(xOffset, 0);
    ctx.lineTo(xOffset, size);
    ctx.stroke();
}

export function drawText(ctx, text, x, y, font = "12px Arial", fillStyle = "black", align = "left", baseLine = "bottom", rotDeg) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotDeg * math.RADIANS);
    ctx.fillStyle = fillStyle;
    ctx.textBaseline = baseLine;
    ctx.font = font;
    ctx.textAlign = align;
    ctx.fillText(text, 0, 0);
    ctx.restore();
}

export const SCALES = [
    [0.001, 10],
    [0.002, 10],
    [0.005, 10],
    [0.01, 10],
    [0.02, 10],
    [0.05, 10],
    [0.1, 10],
    [0.25, 10],
    [0.5, 5],
    [1.0, 10],
    [2.0, 10],
    [5.0, 5],
    [10.0, 10],
    [15.0, 15],
    [30.0, 6],
    [60.0, 12], // 1min
    [120.0, 12], // 2min
    [300.0, 5], // 5min
    [600.0, 10], // 10min
    [900.0, 15], // 15min
    [1800.0, 6], // 30min
    [3600.0, 12], // 1hr
    [7200.0, 10], // 2hr
    [14400.0, 4], // 4hr
    [21600.0, 6], // 6hr
    [43200.0, 12], // 12hr
    [86400.0, 24], // 24hr
    [172800.0, 2], // 2days
    [345600.0, 4], // 4days
    [604800.0, 7], // 7days
    [1296000.0, 15], // 15days
    [2592000.0, 5], // 30days
    [5184000.0, 6], // 60days
    [7776000.0, 9], // 90days
    [15552000.0, 18], // 180days
    [31536000.0, 12], // 365days
    [63072000.0, 2], // 2years
    [126144000.0, 4], // 4years
    [157680000.0, 5], // 5years
    [315360000.0, 10], // 10years
    [630720000.0, 2], // 20years
    [1261440000.0, 4], // 40years
    [1576800000.0, 5], // 50years
    [3153600000.0, 10], // 100years
    [6307200000.0, 2], // 200years
    [12614400000.0, 4], // 400years
    [15768000000.0, 5], // 500years
    [31536000000.0, 10], // 1000years
];

export function getScale(seconds) {
    for (let i = 0, len = SCALES.length; i < len; i++) {
        if (SCALES[i][0] > seconds) {
            return SCALES[i - 1];
        }
    }
}

export const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];
