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


og.utils.htmlColor2rgba = function (htmlColor, opacity) {

    var res;

    if (htmlColor[0] == "#") {
        if (htmlColor.length == 7) {
            res = new og.math.Veector4(
                parseInt(htmlColor[1] + htmlColor[3], 16),
                parseInt(htmlColor[3] + htmlColor[5], 16),
                parseInt(htmlColor[5] + htmlColor[7], 16),
                1.0);
        } else {
            res = new og.math.Vector4(
                parseInt(htmlColor[1], 16),
                parseInt(htmlColor[2], 16),
                parseInt(htmlColor[3], 16),
                1.0)
        }
    } else {
        var m = htmlColor.split(",");

        if (parseFloat(m[3]) == undefined) {
            opacity = 1.0;
        }

        res = new og.math.Vector4(parseInt(m[0].split("(")[1]), parseInt(m[1]), parseInt(m[2]), opacity);
    }

    if (opacity != undefined) {
        res.w = opacity;
    }

    return res;
};

