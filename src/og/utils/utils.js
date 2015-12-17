goog.provide('og.utils');

goog.require('og.Ajax');
goog.require('og.math.Vector4');

/**
 * Openglobus utility namespace.
 * @namespace og.utils
 */

/**
 * Synchronous text file loading. Returns file text.
 * @param {string} fileUrl - File name path.
 * @returns {string}
 */
og.utils.readTextFile = function (fileUrl) {
    var res = "";

    og.Ajax.request(fileUrl, {
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
 * Adds substrings with template.
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
