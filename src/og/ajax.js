goog.provide('og.Ajax');

og.Ajax = {
    ReadyState:
    {
        Uninitialized: 0,
        Loading: 1,
        Loaded: 2,
        Interactive: 3,
        Complete: 4
    },
    Status:
    {
        OK: 200,
        Created: 201,
        Accepted: 202,
        NoContent: 204,
        BadRequest: 400,
        Forbidden: 403,
        NotFound: 404,
        Gone: 410,
        ServerError: 500
    },
    Method: { Get: "GET", Post: "POST" },
    Asynchronous: true,
    Synchronous: false
};


og.Ajax.defaultParams = { type: og.Ajax.Method.Get, async: og.Ajax.Asynchronous, data: null, sender: null, responseType: "text" };

og.Ajax.createXMLHttp = function () {
    var xhr = null;
    if (typeof (XMLHttpRequest) != undefined) {
        xhr = new XMLHttpRequest;
        return xhr;
    } else if (window.ActiveXObject) {
        var ieXMLHttpVersions = ['MSXML2.XMLHttp.5.0', 'MSXML2.XMLHttp.4.0', 'MSXML2.XMLHttp.3.0', 'MSXML2.XMLHttp', 'Microsoft.XMLHttp'];
        for (var i = 0; i < ieXMLHttpVersions.length; i++) {
            try {
                xhr = new ActiveXObject(ieXMLHttpVersions[i]);
                return xhr;
            } catch (e) {
            }
        }
    }
};

og.Ajax.request = function (url, params) {

    var p = {};

    for (var i in og.Ajax.defaultParams) {
        p[i] = og.Ajax.defaultParams[i];
    }

    for (var i in params) {
        p[i] = params[i];
    }

    var xhr = og.Ajax.createXMLHttp();

    xhr.open(p.type, url, p.async);

    if (p.type === og.Ajax.Method.Post) {
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    }

    if (p.async)
        xhr.responseType = p.responseType;

    xhr.overrideMimeType("text/plain");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === og.Ajax.ReadyState.Complete) {
            if (xhr.status === og.Ajax.Status.OK) {
                if (params.success)
                    params.success.call(params.sender ? params.sender : this, xhr.response);
            } else {
                if (params.error)
                    params.error.call(params.sender ? params.sender : this, xhr.response, xhr.status);
            }
        } else {
            //still loading
        }
    };
    xhr.send(params.data ? params.data : og.Ajax.defaultParams.data);
};