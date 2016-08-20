goog.provide('og.utils');

goog.require('og.ajax');
goog.require('og.math.Vector3');
goog.require('og.math.Vector4');
goog.require('og.LonLat');

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
og.utils.colorToVector = function (htmlColor, opacity) {
    if (htmlColor[0] == "#") {
        return og.utils.hexStringToVector(htmlColor, opacity);
    } else {
        return og.utils.rgbaStringToVector(htmlColor, opacity);
    }
};

/**
 * Converts HTML rgba style string to the number vector.
 * @param {string} rgbaString - HTML string color.
 * @param {number} [opacity] - Opacity for the output vector.
 * @returns {og.math.Vector4}
 */
og.utils.rgbaStringToVector = function (rgbaString, opacity) {
    if (opacity == undefined) {
        opacity = 1.0;
    }
    var m = htmlColor.split(",");
    return new og.math.Vector4(parseInt(m[0].split("(")[1]), parseInt(m[1]), parseInt(m[2]), (parseFloat(m[3]) != undefined ? parseFloat(m[3]) : opacity));
};

/**
 * Converts HTML hex style string to the number vector.
 * @param {string} hex- HTML hex style string color.
 * @param {number} [opacity] - Opacity for the output vector.
 * @returns {og.math.Vector4}
 */
og.utils.hexStringToVector = function (hex, opacity) {
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    var hex = hex.replace(shorthandRegex, function (m, r, g, b) {
        return r + r + g + g + b + b;
    });
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return new og.math.Vector4(parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), (opacity == undefined ? 1.0 : opacity));
};

/**
 * Replace template substrings between '{' and '}' tokens.
 * @param {string} template - String with templates in "{" and "}"
 * @param {Object} params - Template named object with subsrtings.
 * @example <caption>Example from og.terrainProvider that replaces tile indexes in url:</caption>
 * var substrings = {
 *       "tilex": 12,
 *       "tiley": 15,
 *       "zoom": 8
 * }
 * og.utils.stringTemplate("http://earth3.openglobus.org/{zoom}/{tiley}/{tilex}.ddm", substrins);
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
        return def.clone();
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
        return def.clone();
    }
    return new og.math.Vector4();
};

og.utils.createColor = function (c, def) {
    if (c) {
        if (c instanceof String) {
            return og.utils.htmlColor2rgba(c);
        } else if (c instanceof Array) {
            return new og.math.Vector4.fromVec(c);
        } else if (c instanceof og.math.Vector4) {
            return c.clone();
        }
    } else if (def) {
        return def.clone();
    }
    return new og.math.Vector4(1.0, 1.0, 1.0, 1.0);
};

og.utils.createLonLat = function (l, def) {
    if (l) {
        if (l instanceof Array) {
            return new og.LonLat(l[0], l[1], l[2] || 0.0);
        } else if (l instanceof og.LonLat) {
            return l.clone();
        }
    } else if (def) {
        return def.clone();
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
 * @todo TESTING
 */
og.utils.binaryInsert = function (ar, el, compare_fn) {
    var i = og.utils.binarySearch(ar, el, compare_fn);
    if (i < 0) {
        i = ~i;
    }
    ar.splice(i, 0, el);
    return i;
};