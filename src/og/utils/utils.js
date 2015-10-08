goog.provide('og.utils');

goog.require('og.Ajax');

og.utils.readTextFile = function( fileUrl ) {
    var res = "";

    og.Ajax.request(fileUrl, {
        async: false,
        success: function (data)
        {
            res = data;
        }
    });

    return res;
};