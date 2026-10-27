import * as math from "../../math";

type BaselineType = "alphabetic" | "bottom" | "hanging" | "ideographic" | "middle" | "top";
type AlignType = "center" | "end" | "left" | "right" | "start";

export function addSeconds(date: Date, seconds: number): Date {
    return new Date(+date + seconds * 1000);
}

export function dateToStr(
    date: Date,
    showTime: boolean = true,
    showMilliseconds: boolean = false,
    use24HourClock: boolean = true
): string {
    let month = MONTHS[date.getUTCMonth()],
        day = date.getUTCDate(),
        year = date.getUTCFullYear();

    if (showTime) {
        let hours = date.getUTCHours(),
            suffix = "";

        if (!use24HourClock) {
            suffix = hours < 12 ? " am" : " pm";
            hours = hours % 12 || 12;
        }

        let h = hours.toString().padStart(2, "0"),
            m = date.getUTCMinutes().toString().padStart(2, "0"),
            s = date.getUTCSeconds().toString().padStart(2, "0");

        if (showMilliseconds) {
            let ms = date.getUTCMilliseconds().toString().padStart(3, "0");
            return `${month} ${day} ${year} ${h}:${m}:${s}.${ms}${suffix}`;
        }

        return `${month} ${day} ${year} ${h}:${m}:${s}${suffix}`;
    }

    return `${month} ${day} ${year}`;
}

/**
 * Formats a date by a template, e.g. "MM/dd/yyyy", "hh:mm:ss.ms". Tokens: yyyy/yy year,
 * MMM month name, MM/M month, dd/d day, hh/h hours, mm/m minutes, ss/s seconds,
 * ms milliseconds, a/A am/pm. Case matters for M/m only. On a 12-hour clock
 * am/pm is appended after the time unless the template places it with "a".
 */
export function formatDate(date: Date, template: string, use24HourClock: boolean = true): string {
    const hours24 = date.getUTCHours();
    const hours = use24HourClock ? hours24 : hours24 % 12 || 12;
    const meridiem = hours24 < 12 ? "am" : "pm";

    const pad = (n: number, len: number) => n.toString().padStart(len, "0");

    let out = "",
        hasHours = false,
        hasMeridiem = false;

    for (let i = 0; i < template.length;) {
        const at = (token: string) => template.startsWith(token, i);
        const atCI = (token: string) => template.slice(i, i + token.length).toLowerCase() === token;

        if (atCI("yyyy")) {
            out += pad(date.getUTCFullYear(), 4);
            i += 4;
        } else if (atCI("yy")) {
            out += pad(date.getUTCFullYear() % 100, 2);
            i += 2;
        } else if (at("MMM")) {
            out += MONTHS[date.getUTCMonth()];
            i += 3;
        } else if (at("MM")) {
            out += pad(date.getUTCMonth() + 1, 2);
            i += 2;
        } else if (at("ms") || at("mS")) {
            out += pad(date.getUTCMilliseconds(), 3);
            i += 2;
        } else if (at("mm")) {
            out += pad(date.getUTCMinutes(), 2);
            i += 2;
        } else if (at("m")) {
            out += date.getUTCMinutes().toString();
            i += 1;
        } else if (at("M")) {
            out += (date.getUTCMonth() + 1).toString();
            i += 1;
        } else if (atCI("dd")) {
            out += pad(date.getUTCDate(), 2);
            i += 2;
        } else if (atCI("d")) {
            out += date.getUTCDate().toString();
            i += 1;
        } else if (atCI("hh")) {
            out += pad(hours, 2);
            hasHours = true;
            i += 2;
        } else if (atCI("h")) {
            out += hours.toString();
            hasHours = true;
            i += 1;
        } else if (atCI("ss")) {
            out += pad(date.getUTCSeconds(), 2);
            i += 2;
        } else if (atCI("s")) {
            out += date.getUTCSeconds().toString();
            i += 1;
        } else if (atCI("a")) {
            out += template[i] === "A" ? meridiem.toUpperCase() : meridiem;
            hasMeridiem = true;
            i += 1;
        } else {
            out += template[i];
            i += 1;
        }
    }

    if (!use24HourClock && hasHours && !hasMeridiem) {
        out += " " + meridiem;
    }

    return out;
}

export function createCanvasHTML(): HTMLCanvasElement {
    return document.createElement("canvas");
}

export function getNearestTimeLeft(t: number, div: number): number {
    return t - (t % div);
}

export function drawNotch(
    ctx: CanvasRenderingContext2D,
    xOffset: number = 0,
    size: number = 10,
    thickness: number = 2,
    color: string = "white"
) {
    ctx.lineWidth = thickness;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(xOffset, 0);
    ctx.lineTo(xOffset, size);
    ctx.stroke();
}

export function drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    font: string = "12px Arial",
    fillStyle: string = "black",
    align: AlignType = "left",
    baseLine: BaselineType = "bottom",
    rotDeg: number = 0
) {
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

export const SCALES: [number, number][] = [
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
    [31536000000.0, 10] // 1000years
];

export function getScale(seconds: number) {
    for (let i = 0, len = SCALES.length; i < len; i++) {
        if (SCALES[i][0] > seconds) {
            return SCALES[i - 1];
        }
    }
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
