goog.provide('og');

if (COMPILED) {
    og.RESOURCES_URL = "http://www.openglobus.org/resources/";
} else {
    og.RESOURCES_URL = "../../resources/";
}

if (COMPILED) {
    /**
     * External shader programs folder url.
     * @const
     * @type {string}
     */
    og.SHADERS_URL = "http://www.openglobus.org/shaders/";
} else {
    og.SHADERS_URL = "../../src/og/shaders/";
}