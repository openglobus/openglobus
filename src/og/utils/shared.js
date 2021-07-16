/**
 * @module og/utils/shared
 */

"use strict";

import { ajax } from "../ajax.js";
import { colorTable } from "./colorTable.js";
import { Extent } from "../Extent.js";
import { LonLat } from "../LonLat.js";
import { Vec2 } from "../math/Vec2.js";
import { Vec3 } from "../math/Vec3.js";
import { Vec4 } from "../math/Vec4.js";

export function getDefault(param, def) {
    return param != undefined ? param : def;
}

export function isEmpty(v) {
    return v == null;
}

let _stampCounter = 0;

export function stamp(obj) {
    var stamp = obj._openglobus_id;
    if (!stamp) {
        stamp = obj._openglobus_id = ++_stampCounter;
    }
    return stamp;
}

export function isString(s) {
    return typeof s === "string" || s instanceof String;
}

/**
 * Synchronous text file loading. Returns file text.
 * @param {string} fileUrl - File name path.
 * @returns {string} -
 */
export function readTextFile(fileUrl) {
    var res = "";

    ajax.request(fileUrl, {
        async: false,
        success: function (data) {
            res = data;
        }
    });

    return res;
}

/**
 * Convert html color string to the RGBA number vector.
 * @param {string} htmlColor - HTML string("#C6C6C6" or "#EF5" or "rgb(8,8,8)" or "rgba(8,8,8)") color.
 * @param {number} [opacity] - Opacity for the output vector.
 * @returns {og.math.Vec4} -
 */
export function htmlColorToRgba(htmlColor, opacity) {
    var hColor = colorTable[htmlColor];
    if (hColor) {
        htmlColor = hColor;
    }

    if (htmlColor[0] === "#") {
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        var hex = htmlColor.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return new Vec4(
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255,
            isEmpty(opacity) ? 1.0 : opacity
        );
    } else {
        if (isEmpty(opacity)) {
            opacity = 1.0;
        }
        var m = htmlColor.split(",");
        return new Vec4(
            parseInt(m[0].split("(")[1]) / 255,
            parseInt(m[1]) / 255,
            parseInt(m[2]) / 255,
            !isEmpty(m[3]) ? parseFloat(m[3]) : opacity
        );
    }
}

export function htmlColorToFloat32Array(htmlColor, opacity) {
    let c = htmlColorToRgba(htmlColor, opacity);
    return new Float32Array([c.x, c.y, c.z, c.w]);
}

/**
 * Convert html color string to the RGB number vector.
 * @param {string} htmlColor - HTML string("#C6C6C6" or "#EF5" or "rgb(8,8,8)" or "rgba(8,8,8)") color.
 * @param {number} [opacity] - Opacity for the output vector.
 * @returns {og.Vec3} -
 */
export function htmlColorToRgb(htmlColor) {
    var hColor = colorTable[htmlColor];
    if (hColor) {
        htmlColor = hColor;
    }

    if (htmlColor[0] === "#") {
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        var hex = htmlColor.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return new Vec4(
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        );
    } else {
        var m = htmlColor.split(",");
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
 * og.utils.stringTemplate("http://earth3.openglobus.org/{z}/{y}/{x}.ddm", substrins);
 * //returns http://earth3.openglobus.org/8/15/12.ddm
 */
export function stringTemplate(template, params) {
    return template.replace(/{[^{}]+}/g, function (key) {
        return params[key.replace(/[{}]+/g, "")] || "";
    });
}

export function getHTML(template, params) {
    return stringTemplate(template, params);
}

export function parseHTML(htmlStr) {
    var p = document.createElement("div");
    p.innerHTML = htmlStr;
    var domArr = [];
    for (var i = 0; i < p.childNodes.length; i++) {
        domArr.push(p.childNodes[i]);
        p.removeChild(p.childNodes[i]);
    }
    return domArr;
}

export function print2d(id, text, x, y) {
    var el = document.getElementById(id);
    if (!el) {
        el = document.createElement("div");
        el.id = id;
        el.classList.add("defaultText");
        document.body.appendChild(el);
    }
    el.innerHTML = text;
    el.style.left = x;
    el.style.top = y;
}

export function defaultString(str, def) {
    return str ? str.trim().toLowerCase() : def;
}

export function createVector3(v, def) {
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

export function createVector4(v, def) {
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

export function createColorRGBA(c, def) {
    if (c) {
        if (isString(c)) {
            return htmlColorToRgba(c);
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

export function createColorRGB(c, def) {
    if (c) {
        if (isString(c)) {
            return htmlColorToRgb(c);
        } else if (c instanceof Array) {
            return Vec3.fromVec(c);
        } else if (c instanceof Vec3) {
            return c.clone();
        }
    } else if (def) {
        return def;
    }
    return new Vec3(1.0, 1.0, 1.0);
}

export function createExtent(e, def) {
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

export function createLonLat(l, def) {
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

export function binarySearchFast(arr, x) {
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
 * @param {Array} ar The sorted array to search.
 * @param {Object} el The item to find in the array.
 * @param {og.utils.binarySearch~compare_fn} compare_fn comparator The function to use to compare the item to
 *        elements in the array.
 * @returns {Number} a negative number  if a is less than b; 0 if a is equal to b;a positive number of a is greater than b.
 *
 * @example
 * // Create a comparator function to search through an array of numbers.
 * function comparator(a, b) {
 *     return a - b;
 * };
 * var numbers = [0, 2, 4, 6, 8];
 * var index = og.utils.binarySearch(numbers, 6, comparator); // 3
 */
export function binarySearch(ar, el, compare_fn) {
    var m = 0;
    var n = ar.length - 1;
    while (m <= n) {
        var k = (n + m) >> 1;
        var cmp = compare_fn(el, ar[k], k);
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
 * @param {Array} ar - The sorted array to insert.
 * @param {Object} el - The item to insert.
 * @param {og.utils.binarySearch~compare_fn} compare_fn - comparator The function to use to compare the item to
 *        elements in the array.
 * @returns {Number} Array index position in which item inserted in.
 */
export function binaryInsert(ar, el, compare_fn) {
    var i = binarySearch(ar, el, compare_fn);
    if (i < 0) {
        i = ~i;
    }
    ar.splice(i, 0, el);
    return i;
}

/**
 * Returns two segment lines intersection coordinate.
 * @static
 * @param {og.math.Vec2} start1 - First line first coordinate.
 * @param {og.math.Vec2} end1 - First line second coordinate.
 * @param {og.math.Vec2} start2 - Second line first coordinate.
 * @param {og.math.Vec2} end2 - Second line second coordinate.
 * @param {boolean} [isSegment] - Lines are segments.
 * @return {og.math.Vec2} - Intersection coordinate.
 */
export function getLinesIntersection2v(start1, end1, start2, end2, isSegment) {
    var dir1 = end1.sub(start1);
    var dir2 = end2.sub(start2);

    var a1 = -dir1.y;
    var b1 = +dir1.x;
    var d1 = -(a1 * start1.x + b1 * start1.y);

    var a2 = -dir2.y;
    var b2 = +dir2.x;
    var d2 = -(a2 * start2.x + b2 * start2.y);

    var seg1_line2_start = a2 * start1.x + b2 * start1.y + d2;
    var seg1_line2_end = a2 * end1.x + b2 * end1.y + d2;

    var seg2_line1_start = a1 * start2.x + b1 * start2.y + d1;
    var seg2_line1_end = a1 * end2.x + b1 * end2.y + d1;

    if (
        isSegment &&
        (seg1_line2_start * seg1_line2_end > 0 || seg2_line1_start * seg2_line1_end > 0)
    ) {
        return null;
    }

    var u = seg1_line2_start / (seg1_line2_start - seg1_line2_end);

    return new Vec2(start1.x + u * dir1.x, start1.y + u * dir1.y);
}

/**
 * Returns two segment lines intersection coordinate.
 * @static
 * @param {og.math.Vec2} start1 - First line first coordinate.
 * @param {og.math.Vec2} end1 - First line second coordinate.
 * @param {og.math.Vec2} start2 - Second line first coordinate.
 * @param {og.math.Vec2} end2 - Second line second coordinate.
 * @param {boolean} [isSegment] - Lines are segments.
 * @return {og.math.Vec2} - Intersection coordinate.
 */
export function getLinesIntersectionLonLat(start1, end1, start2, end2, isSegment) {
    var dir1 = new LonLat(end1.lon - start1.lon, end1.lat - start1.lat);
    var dir2 = new LonLat(end2.lon - start2.lon, end2.lat - start2.lat);

    var a1 = -dir1.lat;
    var b1 = +dir1.lon;
    var d1 = -(a1 * start1.lon + b1 * start1.lat);

    var a2 = -dir2.lat;
    var b2 = +dir2.lon;
    var d2 = -(a2 * start2.lon + b2 * start2.lat);

    var seg1_line2_start = a2 * start1.lon + b2 * start1.lat + d2;
    var seg1_line2_end = a2 * end1.lon + b2 * end1.lat + d2;

    var seg2_line1_start = a1 * start2.lon + b1 * start2.lat + d1;
    var seg2_line1_end = a1 * end2.lon + b1 * end2.lat + d1;

    if (
        isSegment &&
        (seg1_line2_start * seg1_line2_end > 0 || seg2_line1_start * seg2_line1_end > 0)
    ) {
        return null;
    }

    var u = seg1_line2_start / (seg1_line2_start - seg1_line2_end);

    return new LonLat(start1.lon + u * dir1.lon, start1.lat + u * dir1.lat);
}

/**
 * Converts XML to JSON
 * @static
 * @param {Object} xml - Xml object
 * @return {Object} - Json converted object.
 */
export function xmlToJson(xml) {
    // Create the return object
    var obj = {};

    if (xml.nodeType === 1) {
        // element
        // do attributes
        if (xml.attributes.length > 0) {
            obj["@attributes"] = {};
            for (var j = 0; j < xml.attributes.length; j++) {
                var attribute = xml.attributes.item(j);
                obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
            }
        }
    } else if (xml.nodeType === 3) {
        // text
        obj = xml.nodeValue;
    }

    // do children
    if (xml.hasChildNodes()) {
        for (var i = 0; i < xml.childNodes.length; i++) {
            var item = xml.childNodes.item(i);
            var nodeName = item.nodeName;
            if (typeof obj[nodeName] === "undefined") {
                obj[nodeName] = xmlToJson(item);
            } else {
                if (typeof obj[nodeName].push === "undefined") {
                    var old = obj[nodeName];
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
    string: function (v) {
        return isEmpty(v) ? v : v.toString();
    },

    date: function (v) {
        return isEmpty(v) ? v : new Date(v * 1000);
    },

    datetime: function (v) {
        return isEmpty(v) ? v : new Date(v * 1000);
    },

    time: function (v) {
        return isEmpty(v) ? v : parseInt(v);
    },

    integer: function (v) {
        return isEmpty(v) ? v : parseInt(v);
    },

    float: function (v) {
        return isEmpty(v) ? v : parseFloat(v);
    },

    boolean: function (str) {
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

export function base64toBlob(base64Data, contentType) {
    contentType = contentType || "";
    var sliceSize = 1024;
    var byteCharacters = atob(base64Data);
    var bytesLength = byteCharacters.length;
    var slicesCount = Math.ceil(bytesLength / sliceSize);
    var byteArrays = new Array(slicesCount);

    for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
        var begin = sliceIndex * sliceSize;
        var end = Math.min(begin + sliceSize, bytesLength);

        var bytes = new Array(end - begin);
        for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
            bytes[i] = byteCharacters[offset].charCodeAt(0);
        }
        byteArrays[sliceIndex] = new Uint8Array(bytes);
    }
    return new Blob(byteArrays, { type: contentType });
}

export function base64StringToBlog(string) {
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
 * @param {Number} skip
 */
export function throttle(func, limit, skip) {
    let lastFunc;
    let lastRan;
    return function () {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            if (skip) {
                clearTimeout(lastFunc);
            }
            lastFunc = setTimeout(function () {
                if (Date.now() - lastRan >= limit) {
                    func.apply(context, args);
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
export function blerp(x, y, fQ11, fQ21, fQ12, fQ22, x1 = 0.0, x2 = 1.0, y1 = 0.0, y2 = 1.0) {
    return (
        (fQ11 * (x2 - x) * (y2 - y) +
            fQ21 * (x - x1) * (y2 - y) +
            fQ12 * (x2 - x) * (y - y1) +
            fQ22 * (x - x1) * (y - y1)) /
        ((x2 - x1) * (y2 - y1))
    );
}

export function blerp2(x, y, fQ11, fQ21, fQ12, fQ22) {
    return (
        fQ11 * (1.0 - x) * (1.0 - y) + fQ21 * x * (1.0 - y) + fQ12 * (1.0 - x) * y + fQ22 * x * y
    );
}

export function extractElevationTiles(rgbaData, outCurrenElevations, outChildrenElevations) {
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

/**
 * Concatenates two the same type arrays
 * @param {TypedArray} a
 * @param {TypedArray} b
 */
export function concatTypedArrays(a, b) {
    var c = new a.constructor(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
}

/**
 * Concatenates two the same  arrays
 * @param {TypedArray | Array} a
 * @param {TypedArray | Array} b
 */
export function concatArrays(a, b) {
    if (ArrayBuffer.isView(a)) {
        return concatTypedArrays(a, b);
    } else {
        for (var i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
        return a;
    }
}

/**
 * Convert simple array to typed
 * @param arr {Array}
 * @param ctor {Float32ArrayConstructor}
 * @returns {TypedArray}
 */
export function makeArrayTyped(arr, ctor = Float32Array) {
    if (!ArrayBuffer.isView(arr)) {
        const typedArr = new ctor(arr.length);
        typedArr.set(arr, 0);
        return typedArr;
    } else {
        return arr;
    }
}

/**
 * Convert typed array to array
 * @param arr {TypedArray}
 * @returns {Array}
 */
export function makeArray(arr) {
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
 * @param {Array} elements
 */

export function spliceArray(arr, starting, deleteCount, elements) {
    if (ArrayBuffer.isView(arr)) {
        return spliceTypedArray(arr, starting, deleteCount, elements);
    } else {
        arr.splice(starting, deleteCount);
        return arr;
    }
}

/**
 *
 * @param {TypedArray} arr
 * @param {Number} starting
 * @param {Number} deleteCount
 * @param {Array} elements
 */
export function spliceTypedArray(arr, starting, deleteCount, elements = []) {
    if (arr.length === 0) {
        return arr;
    }
    const newSize = arr.length - deleteCount + elements.length;
    const splicedArray = new arr.constructor(newSize);
    splicedArray.set(arr.subarray(0, starting));
    splicedArray.set(elements, starting);
    splicedArray.set(arr.subarray(starting + deleteCount), starting + elements.length);
    return splicedArray;
}

/**
 * Returns triangle coordinate array from inside of the source triangle array.
 * @static
 * @param {Array.<number>} sourceArr - Source array
 * @param {number} gridSize - Source array square matrix size
 * @param {number} i0 - First row index source array matrix
 * @param {number} j0 - First column index
 * @param {number} size - Square matrix result size.
 * @return{Array.<number>} Triangle coordinates array from the source array.
 * @TODO: optimization
 */
export function getMatrixSubArray(sourceArr, gridSize, i0, j0, size) {
    const size_1 = size + 1;
    const i0size = i0 + size_1;
    const j0size = j0 + size_1;

    var res = new Float64Array(size_1 * size_1 * 3);

    var vInd = 0;
    for (var i = i0; i < i0size; i++) {
        for (var j = j0; j < j0size; j++) {
            var ind = 3 * (i * (gridSize + 1) + j);

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
    sourceArr,
    sourceArrHigh,
    sourceArrLow,
    noDataVertices,
    gridSize,
    i0,
    j0,
    size,
    outArr,
    outArrHigh,
    outArrLow,
    outBounds,
    outNoDataVertices
) {
    const i0size = i0 + size + 1;
    const j0size = j0 + size + 1;
    gridSize += 1;
    var vInd = 0,
        nInd = 0;
    for (var i = i0; i < i0size; i++) {
        for (var j = j0; j < j0size; j++) {
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
