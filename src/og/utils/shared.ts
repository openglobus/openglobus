/**
 * @module og/utils/shared
 */

"use strict";

import {Extent} from "../Extent";
import {LonLat} from "../LonLat";
import {Vec2} from "../math/Vec2";
import {NumberArray2} from "../math/Vec2";
import {NumberArray3, Vec3} from "../math/Vec3";
import {NumberArray4, Vec4} from "../math/Vec4";
import {colorTable} from "./colorTable";

export function getDefault(param?: any, def?: any): boolean {
    return param != undefined ? param : def;
}

export function isEmpty(v: any): boolean {
    return v == null;
}

/**
 * Returns true if the object pointer is undefined.
 * @function
 * @param {Object} obj - Object pointer.
 * @returns {boolean} Returns true if object is undefined.
 */
export function isUndef(obj?: any): boolean {
    return obj === void 0;
}

export function isUndefExt(obj: any, defVal: any): any {
    return isUndef(obj) ? defVal : obj;
}

let _stampCounter: number = 0;

export function stamp(obj: any): number {
    let stamp = obj._openglobus_id;
    if (!stamp) {
        stamp = obj._openglobus_id = ++_stampCounter;
    }
    return stamp;
}

export function isString(s: any): boolean {
    return typeof s === "string" || s instanceof String;
}

/**
 * Convert html color string to the RGBA number vector.
 * @param {string} htmlColor - HTML string("#C6C6C6" or "#EF5" or "rgb(8,8,8)" or "rgba(8,8,8)") color.
 * @param {number} [opacity] - Opacity for the output vector.
 * @returns {Vec4} -
 */
export function htmlColorToRgba(htmlColor: string, opacity?: number): Vec4 {
    let hColor: any | undefined = colorTable[htmlColor];
    if (hColor) {
        htmlColor = hColor;
    }

    if (htmlColor[0] === "#") {
        let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        let hex = htmlColor.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            return new Vec4(
                parseInt(result[1], 16) / 255,
                parseInt(result[2], 16) / 255,
                parseInt(result[3], 16) / 255,
                isEmpty(opacity) ? 1.0 : opacity
            );
        } else {
            return new Vec4();
        }
    } else {
        if (isEmpty(opacity)) {
            opacity = 1.0;
        }
        let m = htmlColor.split(",");
        return new Vec4(
            parseInt(m[0].split("(")[1]) / 255,
            parseInt(m[1]) / 255,
            parseInt(m[2]) / 255,
            !isEmpty(m[3]) ? parseFloat(m[3]) : opacity
        );
    }
}

export function htmlColorToFloat32Array(htmlColor: string, opacity?: number): Float32Array {
    let c = htmlColorToRgba(htmlColor, opacity);
    return new Float32Array([c.x, c.y, c.z, c.w]);
}

/**
 * Convert html color string to the RGB number vector.
 * @param {string} htmlColor - HTML string("#C6C6C6" or "#EF5" or "rgb(8,8,8)" or "rgba(8,8,8)") color.
 * @returns {Vec3} -
 */
export function htmlColorToRgb(htmlColor: string): Vec3 {
    let hColor: any | undefined = colorTable[htmlColor];
    if (hColor) {
        htmlColor = hColor;
    }

    if (htmlColor[0] === "#") {
        let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        let hex = htmlColor.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            return new Vec3(
                parseInt(result[1], 16) / 255,
                parseInt(result[2], 16) / 255,
                parseInt(result[3], 16) / 255
            );
        } else {
            return new Vec3();
        }
    } else {
        let m = htmlColor.split(",");
        return new Vec3(
            parseInt(m[0].split("(")[1]) / 255,
            parseInt(m[1]) / 255,
            parseInt(m[2]) / 255
        );
    }
}

/**
 * Replace template substrings between '{' and '}' tokens.
 * @param {string} template - String with templates in "{" and "}"
 * @param {Object} params - Template named object with subsrtings.
 * @returns {string} -
 *
 * @example <caption>Example from og.terrain that replaces tile indexes in url:</caption>
 * var substrings = {
 *       "x": 12,
 *       "y": 15,
 *       "z": 8
 * }
 * og.utils.stringTemplate("http://earth3.openglobus.org/{z}/{y}/{x}.ddm", substrings);
 * //returns http://earth3.openglobus.org/8/15/12.ddm
 */
export function stringTemplate(template: string, params: any): string {
    return template.replace(/{[^{}]+}/g, function (key) {
        return params[key.replace(/[{}]+/g, "")] || "";
    });
}

export function getHTML(template: string, params: any) {
    return stringTemplate(template, params);
}

export function parseHTML(htmlStr: string): HTMLElement[] {
    let p = document.createElement("div");
    p.innerHTML = htmlStr;
    let domArr: HTMLElement[] = [];
    for (let i = 0; i < p.childNodes.length; i++) {
        domArr.push(p.childNodes[i] as HTMLElement);
        p.removeChild(p.childNodes[i]);
    }
    return domArr;
}

export function print2d(id: string, text: string, x: number, y: number) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement("div");
        el.id = id;
        el.classList.add("defaultText");
        document.body.appendChild(el);
    }
    el.innerHTML = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
}

export function defaultString(str?: string, def: string = ""): string {
    return str ? str.trim().toLowerCase() : def;
}

export function createVector3(v?: Vec3 | NumberArray3, def?: Vec3): Vec3 {
    if (v) {
        if (v instanceof Vec3) {
            return v.clone();
        } else if (v instanceof Array) {
            return Vec3.fromVec(v);
        }
    } else if (def) {
        return def;
    }
    return new Vec3();
}

export function createVector4(v?: Vec4 | NumberArray4, def?: Vec4): Vec4 {
    if (v) {
        if (v instanceof Vec4) {
            return v.clone();
        } else if (v instanceof Array) {
            return Vec4.fromVec(v);
        }
    } else if (def) {
        return def;
    }
    return new Vec4();
}

export function createColorRGBA(c?: string | NumberArray4 | Vec4, def?: Vec4): Vec4 {
    if (c) {
        if (isString(c)) {
            return htmlColorToRgba(c as string);
        } else if (c instanceof Array) {
            return Vec4.fromVec(c);
        } else if (c instanceof Vec4) {
            return c.clone();
        }
    } else if (def) {
        return def;
    }
    return new Vec4(1.0, 1.0, 1.0, 1.0);
}

export function createColorRGB(c?: string | NumberArray3 | Vec4, def?: Vec3): Vec3 {
    if (c) {
        if (isString(c)) {
            return htmlColorToRgb(c as string);
        } else if (c instanceof Array) {
            return Vec3.fromVec(c);
        } else if (c instanceof Vec3) {
            return (c as Vec3).clone();
        }
    } else if (def) {
        return def;
    }
    return new Vec3(1.0, 1.0, 1.0);
}

export function createExtent(e?: Extent | NumberArray3[], def?: Extent): Extent {
    if (e) {
        if (e instanceof Array) {
            return new Extent(createLonLat(e[0]), createLonLat(e[1]));
        } else if (e instanceof Extent) {
            return e.clone();
        }
    } else if (def) {
        return def;
    }
    return new Extent();
}

export function createLonLat(l?: LonLat | NumberArray2 | NumberArray3, def?: LonLat): LonLat {
    if (l) {
        if (l instanceof Array) {
            return new LonLat(l[0], l[1], l[2]);
        } else if (l instanceof LonLat) {
            return l.clone();
        }
    } else if (def) {
        return def;
    }
    return new LonLat();
}

export function binarySearchFast(arr: number[], x: number) {
    let start = 0,
        end = arr.length - 1;
    while (start <= end) {
        let k = Math.floor((start + end) * 0.5);
        if (arr[k] === x) {
            return k;
        } else if (arr[k] < x) {
            start = k + 1;
        } else {
            end = k - 1;
        }
    }
    return -1;
}

/**
 * Finds an item in a sorted array.
 * @param {any[]} ar The sorted array to search.
 * @param {any} el The item to find in the array.
 * @param {Function} compare_fn comparator The function to use to compare the item to
 *        elements in the array.
 * @returns {number} a negative number  if 'a' is less than 'b'; 0 if 'a' is equal to 'b'; 'a' positive number of 'a' is greater than 'b'.
 *
 * @example
 * // Create a comparator function to search through an array of numbers.
 * function comparator(a, b) {
 *     return a - b;
 * };
 * var numbers = [0, 2, 4, 6, 8];
 * var index = og.utils.binarySearch(numbers, 6, comparator); // 3
 */
export function binarySearch(ar: any[], el: any, compare_fn: Function): number {
    let m = 0;
    let n = ar.length - 1;
    while (m <= n) {
        let k = (n + m) >> 1;
        let cmp = compare_fn(el, ar[k], k);
        if (cmp > 0) {
            m = k + 1;
        } else if (cmp < 0) {
            n = k - 1;
        } else {
            return k;
        }
    }
    return -m - 1;
}

/**
 * Binary insertion that uses binarySearch algorithm.
 * @param {any[]} ar - The sorted array to insert.
 * @param {any} el - The item to insert.
 * @param {Function} compare_fn - comparator The function to use to compare the item to
 *        elements in the array.
 * @returns {number} Array index position in which item inserted in.
 */
export function binaryInsert(ar: any[], el: any, compare_fn: Function): number {
    let i = binarySearch(ar, el, compare_fn);
    if (i < 0) {
        i = ~i;
    }
    ar.splice(i, 0, el);
    return i;
}

/**
 * Returns two segment lines intersection coordinate.
 * @static
 * @param {Vec2} start1 - First line first coordinate.
 * @param {Vec2} end1 - First line second coordinate.
 * @param {Vec2} start2 - Second line first coordinate.
 * @param {Vec2} end2 - Second line second coordinate.
 * @param {boolean} [isSegment] - Lines are segments.
 * @return {Vec2} - Intersection coordinate.
 */
export function getLinesIntersection2v(start1: Vec2, end1: Vec2, start2: Vec2, end2: Vec2, isSegment: boolean): Vec2 | undefined {
    let dir1 = end1.sub(start1);
    let dir2 = end2.sub(start2);

    let a1 = -dir1.y;
    let b1 = +dir1.x;
    let d1 = -(a1 * start1.x + b1 * start1.y);

    let a2 = -dir2.y;
    let b2 = +dir2.x;
    let d2 = -(a2 * start2.x + b2 * start2.y);

    let seg1_line2_start = a2 * start1.x + b2 * start1.y + d2;
    let seg1_line2_end = a2 * end1.x + b2 * end1.y + d2;

    let seg2_line1_start = a1 * start2.x + b1 * start2.y + d1;
    let seg2_line1_end = a1 * end2.x + b1 * end2.y + d1;

    if (
        isSegment &&
        (seg1_line2_start * seg1_line2_end > 0 || seg2_line1_start * seg2_line1_end > 0)
    ) {
        return undefined;
    }

    let u = seg1_line2_start / (seg1_line2_start - seg1_line2_end);

    return new Vec2(start1.x + u * dir1.x, start1.y + u * dir1.y);
}

/**
 * Returns two segment lines intersection coordinate.
 * @static
 * @param {Vec2} start1 - First line first coordinate.
 * @param {Vec2} end1 - First line second coordinate.
 * @param {Vec2} start2 - Second line first coordinate.
 * @param {Vec2} end2 - Second line second coordinate.
 * @param {boolean} [isSegment] - Lines are segments.
 * @return {Vec2} - Intersection coordinate.
 */
export function getLinesIntersectionLonLat(start1: LonLat, end1: LonLat, start2: LonLat, end2: LonLat, isSegment: boolean): LonLat | undefined {
    let dir1 = new LonLat(end1.lon - start1.lon, end1.lat - start1.lat);
    let dir2 = new LonLat(end2.lon - start2.lon, end2.lat - start2.lat);

    let a1 = -dir1.lat;
    let b1 = +dir1.lon;
    let d1 = -(a1 * start1.lon + b1 * start1.lat);

    let a2 = -dir2.lat;
    let b2 = +dir2.lon;
    let d2 = -(a2 * start2.lon + b2 * start2.lat);

    let seg1_line2_start = a2 * start1.lon + b2 * start1.lat + d2;
    let seg1_line2_end = a2 * end1.lon + b2 * end1.lat + d2;

    let seg2_line1_start = a1 * start2.lon + b1 * start2.lat + d1;
    let seg2_line1_end = a1 * end2.lon + b1 * end2.lat + d1;

    if (
        isSegment &&
        (seg1_line2_start * seg1_line2_end > 0 || seg2_line1_start * seg2_line1_end > 0)
    ) {
        return undefined;
    }

    let u = seg1_line2_start / (seg1_line2_start - seg1_line2_end);

    return new LonLat(start1.lon + u * dir1.lon, start1.lat + u * dir1.lat);
}

/**
 * Converts XML to JSON
 * @static
 * @param {Object} xml - Xml object
 * @return {Object} - Json converted object.
 */
export function xmlToJson(xml: any): any {
    // Create the return object
    let obj: any = {};

    if (xml.nodeType === 1) {
        // element
        // do attributes
        if (xml.attributes.length > 0) {
            obj["@attributes"] = {};
            for (let j = 0; j < xml.attributes.length; j++) {
                let attribute = xml.attributes.item(j);
                obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
            }
        }
    } else if (xml.nodeType === 3) {
        // text
        obj = xml.nodeValue;
    }

    // do children
    if (xml.hasChildNodes()) {
        for (let i = 0; i < xml.childNodes.length; i++) {
            let item = xml.childNodes.item(i);
            let nodeName = item.nodeName;
            if (typeof obj[nodeName] === "undefined") {
                obj[nodeName] = xmlToJson(item);
            } else {
                if (typeof obj[nodeName].push === "undefined") {
                    let old = obj[nodeName];
                    obj[nodeName] = [];
                    obj[nodeName].push(old);
                }
                obj[nodeName].push(xmlToJson(item));
            }
        }
    }
    return obj;
}

export const castType = {
    string: function (v: any) {
        return isEmpty(v) ? v : v.toString();
    },

    date: function (v: any) {
        return isEmpty(v) ? v : new Date(v * 1000);
    },

    datetime: function (v: any) {
        return isEmpty(v) ? v : new Date(v * 1000);
    },

    time: function (v: any) {
        return isEmpty(v) ? v : parseInt(v);
    },

    integer: function (v: any) {
        return isEmpty(v) ? v : parseInt(v);
    },

    float: function (v: any) {
        return isEmpty(v) ? v : parseFloat(v);
    },

    boolean: function (str: any) {
        if (str === null) {
            return str;
        }

        if (typeof str === "boolean") {
            if (str === true) {
                return true;
            }
            return false;
        }
        if (typeof str === "string") {
            if (str === "") {
                return false;
            }
            str = str.replace(/^\s+|\s+$/g, "");
            if (str.toLowerCase() === "true" || str.toLowerCase() === "yes") {
                return true;
            }
            str = str.replace(/,/g, ".");
            str = str.replace(/^\s*\-\s*/g, "-");
        }
        if (!isNaN(str)) {
            return parseFloat(str) !== 0;
        }
        return false;
    }
};

export function base64toBlob(base64Data: string, contentType: string = ""): Blob {

    let sliceSize = 1024;
    let byteCharacters = atob(base64Data);
    let bytesLength = byteCharacters.length;
    let slicesCount = Math.ceil(bytesLength / sliceSize);
    let byteArrays = new Array(slicesCount);

    for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {

        let begin = sliceIndex * sliceSize;
        let end = Math.min(begin + sliceSize, bytesLength);
        let bytes = new Array(end - begin);

        for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
            bytes[i] = byteCharacters[offset].charCodeAt(0);
        }

        byteArrays[sliceIndex] = new Uint8Array(bytes);
    }
    return new Blob(byteArrays, {type: contentType});
}

export function base64StringToBlog(string: string): Blob {

    let block = string.split(";");
    let contentType = block[0].split(":")[1];
    let data = block[1].split(",")[1];

    return base64toBlob(data, contentType);
}

///**
// *
// * @param {LonLat} p
// * @param {LonLat} v1
// * @param {LonLat} v2
// * @param {LonLat} v3
// * @param {Array<Number>} res
// */
//export function cartesianToBarycentricLonLat(p, v1, v2, v3, res) {

//    const y2y3 = v2.lat - v3.lat,
//        x3x2 = v3.lon - v2.lon,
//        x1x3 = v1.lon - v3.lon,
//        y1y3 = v1.lat - v3.lat,
//        y3y1 = v3.lat - v1.lat,
//        xx3 = p.lon - v3.lon,
//        yy3 = p.lat - v3.lat;

//    const d = y2y3 * x1x3 + x3x2 * y1y3,
//        lambda1 = (y2y3 * xx3 + x3x2 * yy3) / d,
//        lambda2 = (y3y1 * xx3 + x1x3 * yy3) / d;

//    res[0] = lambda1;
//    res[1] = lambda2;
//    res[2] = 1 - lambda1 - lambda2;

//    return 0 <= res[0] && res[0] <= 1 && 0 <= lambda1 && lambda1 <= 1 && 0 <= lambda2 && lambda2 <= 1;
//};

/**
 * Callback throttling
 * @param {any} func
 * @param {Number} limit
 * @param {boolean} [skip]
 */
export function throttle(func: Function, limit: number, skip: boolean) {
    let lastFunc: any;
    let lastRan: number = 0;
    return function () {
        const args = arguments;
        if (!lastRan) {
            func.apply(null, args);
            lastRan = Date.now();
        } else {
            if (skip) {
                clearTimeout(lastFunc);
            }
            lastFunc = setTimeout(() => {
                if (Date.now() - lastRan >= limit) {
                    func.apply(null, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

/**
 *
 * y2-----Q12--------------Q22---
 * |       |     |          |
 * |       |     |          |
 * y-------|-----P----------|----
 * |       |     |          |
 * |       |     |          |
 * |       |     |          |
 * |       |     |          |
 * |       |     |          |
 * y1-----Q11----|---------Q21---
 *         |     |          |
 *         |     |          |
 *         x1    x          x2
 *
 *
 * @param {Number} x -
 * @param {Number} y -
 * @param {Number} fQ11 -
 * @param {Number} fQ21 -
 * @param {Number} fQ12 -
 * @param {Number} fQ22 -
 * @param {Number} [x1=0.0] -
 * @param {Number} [x2=1.0] -
 * @param {Number} [y1=0.0] -
 * @param {Number} [y2=1.0] -
 */
export function blerp(
    x: number, y: number, fQ11: number, fQ21: number, fQ12: number, fQ22: number,
    x1: number = 0.0, x2: number = 1.0, y1: number = 0.0, y2: number = 1.0): number {
    return (
        (fQ11 * (x2 - x) * (y2 - y) +
            fQ21 * (x - x1) * (y2 - y) +
            fQ12 * (x2 - x) * (y - y1) +
            fQ22 * (x - x1) * (y - y1)) /
        ((x2 - x1) * (y2 - y1))
    );
}

export function blerp2(x: number, y: number, fQ11: number, fQ21: number, fQ12: number, fQ22: number): number {
    return (
        fQ11 * (1.0 - x) * (1.0 - y) + fQ21 * x * (1.0 - y) + fQ12 * (1.0 - x) * y + fQ22 * x * y
    );
}

export function extractElevationTiles(rgbaData: number[], outCurrenElevations: number[], outChildrenElevations: number[][][]) {
    let destSize = Math.sqrt(outCurrenElevations.length) - 1;
    let destSizeOne = destSize + 1;
    let sourceSize = Math.sqrt(rgbaData.length / 4);
    let dt = sourceSize / destSize;

    let rightHeigh = 0,
        bottomHeigh = 0;

    for (
        let k = 0, currIndex = 0, sourceDataLength = rgbaData.length / 4;
        k < sourceDataLength;
        k++
    ) {
        let height = rgbaData[k * 4];

        let i = Math.floor(k / sourceSize),
            j = k % sourceSize;

        let tileX = Math.floor(j / destSize),
            tileY = Math.floor(i / destSize);

        let destArr = outChildrenElevations[tileY][tileX];

        let ii = i % destSize,
            jj = j % destSize;

        let destIndex = (ii + tileY) * destSizeOne + jj + tileX;

        destArr[destIndex] = height;

        if ((i + tileY) % dt === 0 && (j + tileX) % dt === 0) {
            outCurrenElevations[currIndex++] = height;
        }

        if ((j + 1) % destSize === 0 && j !== sourceSize - 1) {
            //current tile
            rightHeigh = rgbaData[(k + 1) * 4];
            let middleHeight = (height + rightHeigh) * 0.5;
            destIndex = (ii + tileY) * destSizeOne + jj + 1;
            destArr[destIndex] = middleHeight;

            if ((i + tileY) % dt === 0) {
                outCurrenElevations[currIndex++] = middleHeight;
            }

            //next right tile
            let rightindex = (ii + tileY) * destSizeOne + ((jj + 1) % destSize);
            outChildrenElevations[tileY][tileX + 1][rightindex] = middleHeight;
        }

        if ((i + 1) % destSize === 0 && i !== sourceSize - 1) {
            //current tile
            bottomHeigh = rgbaData[(k + sourceSize) * 4];
            let middleHeight = (height + bottomHeigh) * 0.5;
            destIndex = (ii + 1) * destSizeOne + jj + tileX;
            destArr[destIndex] = middleHeight;

            if ((j + tileX) % dt === 0) {
                outCurrenElevations[currIndex++] = middleHeight;
            }

            //next bottom tile
            let bottomindex = ((ii + 1) % destSize) * destSizeOne + jj + tileX;
            outChildrenElevations[tileY + 1][tileX][bottomindex] = middleHeight;
        }

        if (
            (j + 1) % destSize === 0 &&
            j !== sourceSize - 1 &&
            (i + 1) % destSize === 0 &&
            i !== sourceSize - 1
        ) {
            //current tile
            let rightBottomHeight = rgbaData[(k + sourceSize + 1) * 4];
            let middleHeight = (height + rightHeigh + bottomHeigh + rightBottomHeight) * 0.25;
            destIndex = (ii + 1) * destSizeOne + (jj + 1);
            destArr[destIndex] = middleHeight;

            outCurrenElevations[currIndex++] = middleHeight;

            //next right tile
            let rightindex = (ii + 1) * destSizeOne;
            outChildrenElevations[tileY][tileX + 1][rightindex] = middleHeight;

            //next bottom tile
            let bottomindex = destSize;
            outChildrenElevations[tileY + 1][tileX][bottomindex] = middleHeight;

            //next right bottom tile
            let rightBottomindex = 0;
            outChildrenElevations[tileY + 1][tileX + 1][rightBottomindex] = middleHeight;
        }
    }
}

export type TypedArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array;

/**
 * Concatenates two the same type arrays
 * @param {TypedArray} a
 * @param {TypedArray | number[]} b
 */
export function concatTypedArrays(a: TypedArray, b: TypedArray | number[]): TypedArray {
    let c = new (a as any).constructor(a.length + b.length); //hacky
    c.set(a, 0);
    c.set(b, a.length);
    return c;
}

/**
 * Concatenates two the same  arrays
 * @param {TypedArray | number[]} [a=[]] - First array
 * @param {TypedArray | number[]} [b=[]] - Second array
 * @return {TypedArray | number[]} -
 */
export function concatArrays(a: TypedArray | number[] = [], b: TypedArray | number[] = []): TypedArray | number[] {
    if (ArrayBuffer.isView(a)) {
        return concatTypedArrays(a as TypedArray, b as TypedArray);
    } else {
        for (let i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
        return a;
    }
}

/**
 * Convert simple array to typed
 * @param arr {number[]}
 * @param ctor {Float32Array}
 * @returns {TypedArray}
 */
export function makeArrayTyped(arr: TypedArray | number[], ctor: Function = Float32Array) {
    if (!ArrayBuffer.isView(arr)) {
        const typedArr = new (ctor as any)(arr.length); //hacky
        typedArr.set(arr, 0);
        return typedArr;
    } else {
        return arr;
    }
}

/**
 * Convert typed array to array
 * @param arr {TypedArray | number[]}
 * @returns {number[]}
 */
export function makeArray(arr: TypedArray | number[]): number[] {
    if (ArrayBuffer.isView(arr)) {
        return Array.from(arr);
    } else {
        return arr;
    }
}

/**
 *
 * @param {TypedArray | Array} arr
 * @param {Number} starting
 * @param {Number} deleteCount
 * @param {{ result: number[] }} [out]
 */

export function spliceArray(arr: TypedArray | number[], starting: number, deleteCount: number, out?: { result: number[] } | { result: TypedArray }): TypedArray | number[] {
    if (ArrayBuffer.isView(arr)) {
        if (starting < 0) {
            deleteCount = Math.abs(starting);
            starting += arr.length;
        }
        return spliceTypedArray(arr, starting, deleteCount, out as { result: TypedArray });
    } else {
        let res;
        if (starting < 0) {
            res = arr.splice(starting);
        } else {
            res = arr.splice(starting, deleteCount);
        }
        if (out) {
            out.result = res;
        }
        return arr;
    }
}

/**
 *
 * @param {TypedArray} arr
 * @param {Number} starting
 * @param {Number} deleteCount
 * @param {{ result: TypedArray }} [out]
 */
export function spliceTypedArray(arr: TypedArray, starting: number, deleteCount: number, out?: { result: TypedArray }): TypedArray {
    if (arr.length === 0) {
        return arr;
    }
    const newSize = arr.length - deleteCount;
    const splicedArray = new (arr as any).constructor(newSize); //hacky
    splicedArray.set(arr.subarray(0, starting));
    splicedArray.set(arr.subarray(starting + deleteCount), starting);
    if (out) {
        out.result = arr.subarray(starting, starting + deleteCount);
    }
    return splicedArray;
}

/**
 * Returns triangle coordinate array from inside of the source triangle array.
 * @static
 * @param {TypedArray | number[]} sourceArr - Source array
 * @param {number} gridSize - Source array square matrix size
 * @param {number} i0 - First row index source array matrix
 * @param {number} j0 - First column index
 * @param {number} size - Square matrix result size.
 * @return{Float64Array} Triangle coordinates array from the source array.
 * @TODO: optimization
 */
export function getMatrixSubArray(sourceArr: TypedArray | number[], gridSize: number, i0: number, j0: number, size: number): Float64Array {

    const size_1 = size + 1;
    const i0size = i0 + size_1;
    const j0size = j0 + size_1;

    let res = new Float64Array(size_1 * size_1 * 3);
    let vInd = 0;

    for (let i = i0; i < i0size; i++) {
        for (let j = j0; j < j0size; j++) {

            let ind = 3 * (i * (gridSize + 1) + j);

            res[vInd++] = sourceArr[ind];
            res[vInd++] = sourceArr[ind + 1];
            res[vInd++] = sourceArr[ind + 2];
        }
    }

    return res;
}

/**
 * Returns two float32 triangle coordinate arrays from inside of the source triangle array.
 * @static
 * @param {Array.<number>} sourceArr - Source array
 * @param {number} gridSize - Source array square matrix size
 * @param {number} i0 - First row index source array matrix
 * @param {number} j0 - First column index
 * @param {number} size - Square matrix result size.
 * @param {object} outBounds - Output bounds.
 * @return{Array.<number>} Triangle coordinates array from the source array.
 * @TODO: optimization
 */
export function getMatrixSubArrayBoundsExt(
    sourceArr: TypedArray | number[],
    sourceArrHigh: TypedArray | number[],
    sourceArrLow: TypedArray | number[],
    noDataVertices: TypedArray | number[] | undefined,
    gridSize: number,
    i0: number,
    j0: number,
    size: number,
    outArr: TypedArray | number[],
    outArrHigh: TypedArray | number[],
    outArrLow: TypedArray | number[],
    outBounds: any,
    outNoDataVertices: TypedArray | number[]
) {
    const i0size = i0 + size + 1;
    const j0size = j0 + size + 1;

    gridSize += 1;

    let vInd = 0,
        nInd = 0;

    for (let i = i0; i < i0size; i++) {
        for (let j = j0; j < j0size; j++) {
            let indBy3 = i * gridSize + j,
                ind = 3 * indBy3;

            let x = sourceArr[ind],
                y = sourceArr[ind + 1],
                z = sourceArr[ind + 2];

            if (!noDataVertices || noDataVertices[indBy3] === 0) {
                if (x < outBounds.xmin) outBounds.xmin = x;
                if (x > outBounds.xmax) outBounds.xmax = x;
                if (y < outBounds.ymin) outBounds.ymin = y;
                if (y > outBounds.ymax) outBounds.ymax = y;
                if (z < outBounds.zmin) outBounds.zmin = z;
                if (z > outBounds.zmax) outBounds.zmax = z;
            } else {
                outNoDataVertices[nInd] = 1;
            }

            nInd++;

            outArr[vInd] = x;
            outArrLow[vInd] = sourceArrLow[ind];
            outArrHigh[vInd++] = sourceArrHigh[ind];

            outArr[vInd] = y;
            outArrLow[vInd] = sourceArrLow[ind + 1];
            outArrHigh[vInd++] = sourceArrHigh[ind + 1];

            outArr[vInd] = z;
            outArrLow[vInd] = sourceArrLow[ind + 2];
            outArrHigh[vInd++] = sourceArrHigh[ind + 2];
        }
    }
}

export function cloneArray(items: any[]): any[] {
    return items.map((item) => (Array.isArray(item) ? cloneArray(item) : item));
}

/**
 * Promise for load images
 * @function
 * @param {string} url - link to image.
 * @returns {Promise<Image>} Returns promise.
 */
export async function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise(resolve => {
        const image = new Image();
        image.addEventListener('load', () => {
            resolve(image);
        });
        image.src = url;
        image.crossOrigin = ""
        return image;
    });
}

/**
 * Gets image is loaded
 * @param {HTMLImageElement} image
 * @returns {boolean} Returns true is the image is loaded
 */
export function isImageLoaded(image: HTMLImageElement): boolean {
    return image.complete && image.naturalHeight !== 0;
}

export function distanceFormat(v: number): string {
    if (v > 1000) {
        return `${(v / 1000).toFixed(1)} km`;
    } else if (v > 9) {
        return `${Math.round(v)} m`;
    } else {
        return `${v.toFixed(1)} m`;
    }
}

export function getUrlParam(paramName: string): number | undefined {
    let urlParams = new URLSearchParams(location.search);
    let param = urlParams.get(paramName);
    if (param) {
        return Number(param);
    }
}
