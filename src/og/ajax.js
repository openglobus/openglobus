/**
 * @module og/ajax
 */

'use strict';

/**
 * Ajax parameters.
 * @namespace og.ajax
 */
const ajax = {
    /**
     * Ajax ready state result.
     * @enum
     */
    ReadyState:
    {
        Uninitialized: 0,
        Loading: 1,
        Loaded: 2,
        Interactive: 3,
        Complete: 4
    },
    /**
     * Ajax status code.
     * @enum
     */
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
    /**
     * Ajax query method.
     * @enum
     */
    Method: {
        Get: "GET",
        Post: "POST"
    },
    /**
     * Ajax query type is asynchronous.
     * @type {boolean}
     */
    Asynchronous: true,
    /**
     * Ajax query type is synchronous.
     * @type {boolean}
     */
    Synchronous: false
};

/**
 * Xhr object that returned by ajax query.
 * @class
 * @param {Object} xhr - Current ActiveXObject object.
 */
const Xhr = function (xhr) {
    /**
     * ActiveXObject object.
     * @private
     * @type {Object}
     */
    var _xhr = xhr;

    /**
     * Aborts current ajax.
     * @public
     */
    this.abort = function () {
        _xhr.aborted = true;
        _xhr.abort();
    };
};

const defaultParams = {
    type: ajax.Method.Get,
    async: ajax.Asynchronous,
    data: null,
    sender: null,
    responseType: "text"
};

function createXMLHttp() {
    var xhr = null;
    if (typeof XMLHttpRequest !== undefined) {
        xhr = new XMLHttpRequest;
        return xhr;
    } else if (window.ActiveXObject) {
        var ieXMLHttpVersions = ['MSXML2.XMLHttp.5.0', 'MSXML2.XMLHttp.4.0', 'MSXML2.XMLHttp.3.0', 'MSXML2.XMLHttp', 'Microsoft.XMLHttp'];
        for (var i = 0; i < ieXMLHttpVersions.length; i++) {
            try {
                xhr = new ActiveXObject(ieXMLHttpVersions[i]);
                return xhr;
            } catch (e) {
                console.log('error: og.ajax.createXMLHttp creation filed.');
            }
        }
    }
};

/**
 * Send an ajax request.
 * @function
 * @param {string} url - Url path.
 * @param {Object} [params] - Ajax parameters:
 * @param {ajax.Method|string} [params.type] - 'POST' or 'GET' ajax method. 'GET' is default.
 * @param {boolean} [params.async] - Asynchronous ajax flag. True is default.
 * @param {Object} [params.data] - Qery data.
 * @param {Object} [params.sender] - Sender object, that success callback binded with. ActiveXObject is default.
 * @param {string} [params.responseType] - Responce data type. Culd be 'text', 'json', 'jsonp', 'html'. 'text' is default.
 * @param {ajax.Xhr~successCallback} [params.success] - The callback that handles the success response.
 * @param {ajax.Xhr~errorCallback} [params.error] - The callback that handles the failed response.
 * @param {ajax.Xhr~abortCallback} [params.abort] - The callback that handles aborted requests.
 * @returns {ajax.Xhr} - Returns object that could be aborted.
 */
ajax.request = function (url, params) {

    params = params || {};

    var p = {}, i;

    for (i in defaultParams) {
        p[i] = defaultParams[i];
    }

    for (i in params) {
        p[i] = params[i];
    }

    p.data = params.data;

    var xhr = createXMLHttp();

    var customXhr = new Xhr(xhr);

    var body = null, d;

    if (p.type === ajax.Method.Post) {
        if (p.data) {
            body = "";
            for (let key in p.data) {
                d = p.data[key];
                body += key + "=" + encodeURIComponent(d instanceof Object ? JSON.stringify(d) : d) + "&";
            }
            body = body.slice(0, -1);
        }
        xhr.open(p.type, url, p.async);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    } else if (p.data) {
        var tail = "?";
        for (let key in p.data) {
            d = p.data[key];
            tail += key + "=" + encodeURIComponent(d instanceof Object ? JSON.stringify(d) : d) + "&";
        }
        tail = tail.slice(0, -1);
        xhr.open(p.type, url + tail, p.async);
    } else {
        xhr.open(p.type, url, p.async);
    }

    if (p.async)
        xhr.responseType = p.responseType;

    xhr.overrideMimeType("text/plain");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === ajax.ReadyState.Complete) {
            if (xhr.status === ajax.Status.OK) {
                if (params.success)
                    /**
                     * Success callback.
                     * @callback ajax.Xhr~successCallback
                     * @param {Object} Response data
                     */
                    params.success.call(params.sender || customXhr, xhr.response);
            } else if (xhr.aborted) {
                /**
                 * Abort callback.
                 * @callback ajax.Xhr~abortCallback
                 * @param {Object} Response data
                 * @param {Object} Status object
                 */
                params.abort && params.abort.call(params.sender || customXhr, xhr.response, xhr.status);
            } else {
                /**
                 * Error callback.
                 * @callback ajax.Xhr~errorCallback
                 * @param {Object} Response data
                 * @param {Object} Status object
                 */
                params.error && params.error.call(params.sender || customXhr, xhr.response, xhr.status);
            }
            delete xhr['onreadystatechange'];
            xhr.onreadystatechange = null;
            xhr = null;
        } else {
            //still loading
        }
    };

    xhr.send(body);

    return customXhr;
};

export { ajax };