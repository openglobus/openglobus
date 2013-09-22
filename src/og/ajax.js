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
    var p;

    if (params)
        p = params;
    else
        p = og.Ajax.defaultParams;
    
    var xhr = og.Ajax.createXMLHttp();
    xhr.open(p.type ? p.type : og.Ajax.defaultParams.type, url, p.async);
    if (p.type === og.Ajax.Method.Post) {
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    }
    xhr.responseType = p.responseType ? p.responseType : og.Ajax.defaultParams.responseType;
    xhr.onreadystatechange = function () {
        if (xhr.readyState === og.Ajax.ReadyState.Complete) {
            if (xhr.status === og.Ajax.Status.OK) {
                params.success.call(p.sender ? p.sender : this, xhr.response);
            } else {
                params.error.call(p.sender ? p.sender : this, xhr.response, xhr.status);
            }
        } else {
            //still loading
        }
    };
    xhr.send(p.data ? p.data : og.Ajax.defaultParams.data);
};