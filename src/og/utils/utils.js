goog.provide('og.utils');

goog.require('og.Ajax');
goog.require('og.math.Vector4');

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

og.utils.colorToVector = function (htmlColor, opacity) {
    if (htmlColor[0] == "#") {
        return og.utils.hexStringToVector(htmlColor, opacity);
    } else {
        return og.utils.rgbaStringToVector(htmlColor, opacity);
    }
};

og.utils.rgbaStringToVector = function (rgbaString, opacity) {
    if (opacity == undefined) {
        opacity = 1.0;
    }
    var m = htmlColor.split(",");
    return new og.math.Vector4(parseInt(m[0].split("(")[1]), parseInt(m[1]), parseInt(m[2]), (parseFloat(m[3]) != undefined ? parseFloat(m[3]) : opacity));
};

og.utils.hexStringToVector = function (hex, opacity) {
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    var hex = hex.replace(shorthandRegex, function (m, r, g, b) {
        return r + r + g + g + b + b;
    });
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return new og.math.Vector4(parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), (opacity == undefined ? 1.0 : opacity));
};
