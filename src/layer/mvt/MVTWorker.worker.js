"use strict";
//
// Vector tiles decoding worker
//
import { decodeMVTFeatures, getMVTDecodedTransferables } from "./decodeMVTFeatures";

self.onmessage = function (e) {
    let result = null,
        transfer = [];

    try {
        result = decodeMVTFeatures(e.data.data, e.data.request);
        transfer = getMVTDecodedTransferables(result);
    } catch (err) {
        console.error(err);
    }

    self.postMessage({ id: e.data.id, result: result }, transfer);
};
