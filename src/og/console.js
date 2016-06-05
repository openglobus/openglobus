goog.provide('og.Console');

og.Console = (function () {

    var Console = function () {
        var container = document.createElement("div");
        container.classList.add("ogConsole");
        container.style.display = "none";
        document.body.appendChild(container);

        this.show = function () {
            container.style.display = "block";
        };

        this.hide = function () {
            container.style.display = "none";
        };

        this.logErr = function (str) {
            var d = document.createElement("div");
            d.classList.add("ogConsole-text");
            d.classList.add("ogConsole-error");
            d.innerHTML = "error: " + str;
            container.appendChild(d);
            this.show();
        };

        this.logWrn = function (str) {
            var d = document.createElement("div");
            d.classList.add("ogConsole-text");
            d.classList.add("ogConsole-warning");
            d.innerHTML = "warning: " + str;
            container.appendChild(d);
            this.show();
        };

        this.log = function (str, style) {
            var d = document.createElement("div");
            d.classList.add("ogConsole-text");
            if (style) {
                for (var s in style) {
                    d.style[s] = style[s];
                }
            }
            d.innerHTML = str;
            container.appendChild(d);
            this.show();
        };
    };

    var instance;

    return {
        getInstance: function () {
            if (!instance) {
                instance = new Console();
            }
            return instance;
        }
    };
})();
