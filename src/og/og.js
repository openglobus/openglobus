goog.provide('og');

if (COMPILED) {
    og.RESOURCES_URL = "./resources/";
} else {
    og.RESOURCES_URL = "../../resources/";
}

if (COMPILED) {
    /**
     * External shader programs folder url.
     * @const
     * @type {string}
     */
    og.SHADERS_URL = "./shaders/";
} else {
    og.SHADERS_URL = "../../src/og/shaders/";
}