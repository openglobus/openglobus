goog.provide('og.ajax');

goog.provide('og.ajax.Xhr');

/**
 * Ajax parameters.
 * @namespace og.ajax
 */
og.ajax = {
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
og.ajax.Xhr = function (xhr) {
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
    }
};

og.ajax.defaultParams = {
    type: og.ajax.Method.Get,
    async: og.ajax.Asynchronous,
    data: null,
    sender: null,
    responseType: "text"
};

og.ajax.createXMLHttp = function () {
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

/**
 * Send an ajax request.
 * @function
 * @param {string} url - Url path.
 * @param {Object} [params] - Ajax parameters:
 * @param {og.ajax.Method|string} [params.type] - 'POST' or 'GET' ajax method. 'GET' is default.
 * @param {boolean} [params.async] - Asynchronous ajax flag. True is default.
 * @param {Object} [params.data] - Qery data.
 * @param {Object} [params.sender] - Sender object, that success callback binded with. ActiveXObject is default.
 * @param {string} [params.responseType] - Responce data type. Culd be 'text', 'json', 'jsonp', 'html'. 'text' is default.
 * @param {og.ajax.Xhr~successCallback} [params.success] - The callback that handles the success response.
 * @param {og.ajax.Xhr~errorCallback} [params.error] - The callback that handles the failed response.
 * @param {og.ajax.Xhr~abortCallback} [params.abort] - The callback that handles aborted requests.
 * @returns {og.ajax.Xhr} - Returns object that could be aborted.
 */
og.ajax.request = function (url, params) {

    params = params || {};

    var p = {};

    for (var i in og.ajax.defaultParams) {
        p[i] = og.ajax.defaultParams[i];
    }

    for (var i in params) {
        p[i] = params[i];
    }

    var xhr = og.ajax.createXMLHttp();

    var customXhr = new og.ajax.Xhr(xhr);

    xhr.open(p.type, url, p.async);

    if (p.type === og.ajax.Method.Post) {
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    }

    if (p.async)
        xhr.responseType = p.responseType;

    xhr.overrideMimeType("text/plain");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === og.ajax.ReadyState.Complete) {
            if (xhr.status === og.ajax.Status.OK) {
                if (params.success)
                    /**
                     * Success callback.
                     * @callback og.ajax.Xhr~successCallback
                     * @param {Object} Response data
                     */
                    params.success.call(params.sender || customXhr, xhr.response);
            } else if (xhr.aborted) {
                /**
                 * Abort callback.
                 * @callback og.ajax.Xhr~abortCallback
                 * @param {Object} Response data
                 * @param {Object} Status object
                 */
                params.abort && params.abort.call(params.sender || customXhr, xhr.response, xhr.status);
            } else {
                /**
                 * Error callback.
                 * @callback og.ajax.Xhr~errorCallback
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

    xhr.send(params.data || og.ajax.defaultParams.data);

    return customXhr;
};
