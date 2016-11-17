goog.provide('og.utils');

goog.require('og.ajax');
goog.require('og.math.Vector2');
goog.require('og.math.Vector3');
goog.require('og.math.Vector4');
goog.require('og.LonLat');
goog.require('og.Extent');

/**
 * Synchronous text file loading. Returns file text.
 * @param {string} fileUrl - File name path.
 * @returns {string}
 */
og.utils.readTextFile = function (fileUrl) {
    var res = "";

    og.ajax.request(fileUrl, {
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
 * @returns {og.math.Vector4}
 */
og.utils.htmlColorToRgba = function (htmlColor, opacity) {
    if (htmlColor[0] == "#") {
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        var hex = hex.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return new og.math.Vector4(parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), (opacity == undefined ? 1.0 : opacity));
    } else {
        if (opacity == undefined) {
            opacity = 1.0;
        }
        var m = htmlColor.split(",");
        return new og.math.Vector4(parseInt(m[0].split("(")[1]), parseInt(m[1]), parseInt(m[2]), (parseFloat(m[3]) != undefined ? parseFloat(m[3]) : opacity));
    }
};

/**
 * Convert html color string to the RGB number vector.
 * @param {string} htmlColor - HTML string("#C6C6C6" or "#EF5" or "rgb(8,8,8)" or "rgba(8,8,8)") color.
 * @param {number} [opacity] - Opacity for the output vector.
 * @returns {og.math.Vector3}
 */
og.utils.htmlColorToRgb = function (htmlColor) {
    if (htmlColor[0] == "#") {
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        var hex = hex.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return new og.math.Vector4(parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16));
    } else {
        var m = htmlColor.split(",");
        return new og.math.Vector3(parseInt(m[0].split("(")[1]), parseInt(m[1]), parseInt(m[2]));
    }
};

/**
 * Replace template substrings between '{' and '}' tokens.
 * @param {string} template - String with templates in "{" and "}"
 * @param {Object} params - Template named object with subsrtings.
 * @example <caption>Example from og.terrainProvider that replaces tile indexes in url:</caption>
 * var substrings = {
 *       "x": 12,
 *       "y": 15,
 *       "z": 8
 * }
 * og.utils.stringTemplate("http://earth3.openglobus.org/{z}/{y}/{x}.ddm", substrins);
 * //returns http://earth3.openglobus.org/8/15/12.ddm
 */
og.utils.stringTemplate = function (template, params) {
    return template.replace(/{[^{}]+}/g, function (key) {
        return params[key.replace(/[{}]+/g, "")] || "";
    });
};

function print2d(id, text, x, y) {
    var el = document.getElementById(id);
    el.innerHTML = text;
    el.style.left = x;
    el.style.top = y;
};

og.utils.defaultString = function (str, def) {
    return str ? str.trim().toLowerCase() : def;
};

og.utils.createVector3 = function (v, def) {
    if (v) {
        if (v instanceof og.math.Vector3) {
            return v.clone();
        } else if (v instanceof Array) {
            return og.math.Vector3.fromVec(v);
        }
    } else if (def) {
        return def;
    }
    return new og.math.Vector3();
};

og.utils.createVector4 = function (v, def) {
    if (v) {
        if (v instanceof og.math.Vector4) {
            return v.clone();
        } else if (v instanceof Array) {
            return og.math.Vector4.fromVec(v);
        }
    } else if (def) {
        return def;
    }
    return new og.math.Vector4();
};

og.utils.createColorRGBA = function (c, def) {
    if (c) {
        if (c instanceof String) {
            return og.utils.htmlColorToRgba(c);
        } else if (c instanceof Array) {
            return new og.math.Vector4.fromVec(c);
        } else if (c instanceof og.math.Vector4) {
            return c.clone();
        }
    } else if (def) {
        return def;
    }
    return new og.math.Vector4(1.0, 1.0, 1.0, 1.0);
};

og.utils.createColorRGB = function (c, def) {
    if (c) {
        if (c instanceof String) {
            return og.utils.htmlColorToRgb(c);
        } else if (c instanceof Array) {
            return new og.math.Vector3.fromVec(c);
        } else if (c instanceof og.math.Vector3) {
            return c.clone();
        }
    } else if (def) {
        return def;
    }
    return new og.math.Vector3(1.0, 1.0, 1.0);
};

og.utils.createExtent = function (e, def) {
    if (e) {
        if (e instanceof Array) {
            return new og.Extent(
                og.utils.createLonLat(e[0]),
                og.utils.createLonLat(e[1]));
        } else if (e instanceof og.Extent) {
            return e.clone();
        }
    } else if (def) {
        return def;
    }
    return new og.Extent();
};

og.utils.createLonLat = function (l, def) {
    if (l) {
        if (l instanceof Array) {
            return new og.LonLat(l[0], l[1], l[2]);
        } else if (l instanceof og.LonLat) {
            return l.clone();
        }
    } else if (def) {
        return def;
    }
    return og.LonLat();
};


/**
 * Finds an item in a sorted array.
 * @param {Array} ar The sorted array to search.
 * @param {Object} el The item to find in the array.
 * @param {og.utils.binarySearch~compare_fn} comparator The function to use to compare the item to
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
og.utils.binarySearch = function (ar, el, compare_fn) {
    var m = 0;
    var n = ar.length - 1;
    while (m <= n) {
        var k = (n + m) >> 1;
        var cmp = compare_fn(el, ar[k]);
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
 * @todo NEEDS TESTING
 */
og.utils.binaryInsert = function (ar, el, compare_fn) {
    var i = og.utils.binarySearch(ar, el, compare_fn);
    if (i < 0) {
        i = ~i;
    }
    ar.splice(i, 0, el);
    return i;
};

/**
 * Returns two segment lines intersection coordinate.
 * @static
 * @param {og.math.Vector2} start1 - First line first coordinate.
 * @param {og.math.Vector2} end1 - First line second coordinate.
 * @param {og.math.Vector2} start2 - Second line first coordinate.
 * @param {og.math.Vector2} end2 - Second line second coordinate.
 * @param {boolean} [isSegments] - Lines are segments.
 * @return {og.math.Vector2} - Intersection coordinate.
 */
og.utils.getLinesIntersection2v = function (start1, end1, start2, end2, isSegment) {
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

    return new og.math.Vector2(start1.x + u * dir1.x, start1.y + u * dir1.y);
};

/**
 * Returns two segment lines intersection coordinate.
 * @static
 * @param {og.math.Vector2} start1 - First line first coordinate.
 * @param {og.math.Vector2} end1 - First line second coordinate.
 * @param {og.math.Vector2} start2 - Second line first coordinate.
 * @param {og.math.Vector2} end2 - Second line second coordinate.
 * @param {boolean} [isSegments] - Lines are segments.
 * @return {og.math.Vector2} - Intersection coordinate.
 */
og.utils.getLinesIntersectionLonLat = function (start1, end1, start2, end2, isSegment) {
    var dir1 = new og.LonLat(end1.lon - start1.lon, end1.lat - start1.lat);
    var dir2 = new og.LonLat(end2.lon - start2.lon, end2.lat - start2.lat);

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

    return new og.LonLat(start1.lon + u * dir1.lon, start1.lat + u * dir1.lat);
};