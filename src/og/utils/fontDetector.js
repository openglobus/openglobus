goog.provide('og.FontDetector');

/**
 * Font detector class.
 * @class
 */
og.FontDetector = function () {
    var baseFonts = ['monospace', 'sans-serif', 'serif'];
    var testString = "mmmmmmmmmmlli";
    var testSize = '72px';
    var h = document.getElementsByTagName("body")[0];
    var s = document.createElement("span");
    s.style.fontSize = testSize;
    s.innerHTML = testString;
    var defaultWidth = {};
    var defaultHeight = {};
    for (var index in baseFonts) {
        s.style.fontFamily = baseFonts[index];
        h.appendChild(s);
        defaultWidth[baseFonts[index]] = s.offsetWidth;
        defaultHeight[baseFonts[index]] = s.offsetHeight;
        h.removeChild(s);
    }

    /**
     * Returns true if font is known.
     * @public
     * @param {string} font - Font name.
     * @returns {boolean}
     */
    this.detect = function (font) {
        var detected = false;
        for (var index in baseFonts) {
            s.style.fontFamily = font + ',' + baseFonts[index];
            h.appendChild(s);
            var matched = (s.offsetWidth != defaultWidth[baseFonts[index]] || s.offsetHeight != defaultHeight[baseFonts[index]]);
            h.removeChild(s);
            detected = detected || matched;
        }
        return detected;
    }
};