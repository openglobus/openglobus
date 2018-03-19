/**
 * @module og/utils/shared
 */

'use strict';

import { ajax } from '../ajax.js';
import { colorTable } from './colorTable.js';
import { Extent } from '../Extent.js';
import { LonLat } from '../LonLat.js';
import { Vec2 } from '../math/Vec2.js';
import { Vec3 } from '../math/Vec3.js';
import { Vec4 } from '../math/Vec4.js';

const EMPTY = void (0);

export function isEmpty(v) {
    return v === EMPTY;
};

let _stampCounter = 0;
export function stamp(obj) {
    var stamp = obj._openglobus_id;
    if (!stamp) {
        stamp = obj._openglobus_id = ++_stampCounter;
    }
    return stamp;
};

export function isString(s) {
    return typeof (s) === 'string' || s instanceof String;
};

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
};

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
        return new Vec4(parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255, isEmpty(opacity) ? 1.0 : opacity);
    } else {
        if (isEmpty(opacity)) {
            opacity = 1.0;
        }
        var m = htmlColor.split(",");
        return new Vec4(parseInt(m[0].split("(")[1]) / 255, parseInt(m[1]) / 255, parseInt(m[2]) / 255, !isEmpty(m[3]) ? parseFloat(m[3]) : opacity);
    }
};

/**
 * Convert html color string to the RGB number vector.
 * @param {string} htmlColor - HTML string("#C6C6C6" or "#EF5" or "rgb(8,8,8)" or "rgba(8,8,8)") color.
 * @param {number} [opacity] - Opacity for the output vector.
 * @returns {og.math.Vec3} -
 */
export function htmlColorToRgb(htmlColor) {
    var hColor = colorTable[htmlColor];
    if (hColor) {
        htmlColor = hColor;
    }

    if (htmlColor[0] === '#') {
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        var hex = htmlColor.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return new Vec4(parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255);
    } else {
        var m = htmlColor.split(",");
        return new Vec3(parseInt(m[0].split("(")[1]) / 255, parseInt(m[1]) / 255, parseInt(m[2]) / 255);
    }
};

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
};

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
};

export function defaultString(str, def) {
    return str ? str.trim().toLowerCase() : def;
};

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
};

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
};

export function createColorRGBA(c, def) {
    if (c) {
        if (isString(c)) {
            return htmlColorToRgba(c);
        } else if (c instanceof Array) {
            return new Vec4.fromVec(c);
        } else if (c instanceof Vec4) {
            return c.clone();
        }
    } else if (def) {
        return def;
    }
    return new Vec4(1.0, 1.0, 1.0, 1.0);
};

export function createColorRGB(c, def) {
    if (c) {
        if (isString(c)) {
            return htmlColorToRgb(c);
        } else if (c instanceof Array) {
            return new Vec3.fromVec(c);
        } else if (c instanceof Vec3) {
            return c.clone();
        }
    } else if (def) {
        return def;
    }
    return new Vec3(1.0, 1.0, 1.0);
};

export function createExtent(e, def) {
    if (e) {
        if (e instanceof Array) {
            return new Extent(
                createLonLat(e[0]),
                createLonLat(e[1]));
        } else if (e instanceof Extent) {
            return e.clone();
        }
    } else if (def) {
        return def;
    }
    return new Extent();
};

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
};


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
};

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
};

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

    if (isSegment && (seg1_line2_start * seg1_line2_end > 0 || seg2_line1_start * seg2_line1_end > 0))
        return null;

    var u = seg1_line2_start / (seg1_line2_start - seg1_line2_end);

    return new Vec2(start1.x + u * dir1.x, start1.y + u * dir1.y);
};

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

    if (isSegment && (seg1_line2_start * seg1_line2_end > 0 || seg2_line1_start * seg2_line1_end > 0))
        return null;

    var u = seg1_line2_start / (seg1_line2_start - seg1_line2_end);

    return new LonLat(start1.lon + u * dir1.lon, start1.lat + u * dir1.lat);
};

/**
 * Converts XML to JSON
 * @static
 * @param {Object} xml - Xml object
 * @return {Object} - Json converted object.
 */
export function xmlToJson(xml) {

    // Create the return object
    var obj = {};

    if (xml.nodeType === 1) { // element
        // do attributes
        if (xml.attributes.length > 0) {
            obj["@attributes"] = {};
            for (var j = 0; j < xml.attributes.length; j++) {
                var attribute = xml.attributes.item(j);
                obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
            }
        }
    } else if (xml.nodeType === 3) { // text
        obj = xml.nodeValue;
    }

    // do children
    if (xml.hasChildNodes()) {
        for (var i = 0; i < xml.childNodes.length; i++) {
            var item = xml.childNodes.item(i);
            var nodeName = item.nodeName;
            if (typeof (obj[nodeName]) === "undefined") {
                obj[nodeName] = xmlToJson(item);
            } else {
                if (typeof (obj[nodeName].push) === "undefined") {
                    var old = obj[nodeName];
                    obj[nodeName] = [];
                    obj[nodeName].push(old);
                }
                obj[nodeName].push(xmlToJson(item));
            }
        }
    }
    return obj;
};

export const castType = {
    "string": function (v) {
        return v !== EMPTY ? v.toString() : v;
    },

    "date": function (v) {
        return v !== EMPTY ? new Date(v * 1000) : v;
    },

    "datetime": function (v) {
        return v !== EMPTY ? new Date(v * 1000) : v;
    },

    "time": function (v) {
        return v !== EMPTY ? parseInt(v) : v;
    },

    "integer": function (v) {
        return v !== EMPTY ? parseInt(v) : v;
    },

    "float": function (v) {
        return v !== EMPTY ? parseFloat(v) : v;
    },

    "boolean": function (str) {
        if (str === null)
            return str;

        if (typeof str === 'boolean') {
            if (str === true)
                return true;
            return false;
        }
        if (typeof str === 'string') {
            if (str === "")
                return false;
            str = str.replace(/^\s+|\s+$/g, '');
            if (str.toLowerCase() === 'true' || str.toLowerCase() === 'yes')
                return true;
            str = str.replace(/,/g, '.');
            str = str.replace(/^\s*\-\s*/g, '-');
        }
        if (!isNaN(str))
            return parseFloat(str) !== 0;
        return false;
    }
};