goog.provide('og.control.LoadingSpinner');

goog.require('og.control.Control');

og.control.LoadingSpinner = function (options) {
    og.base(this, options);
    this.spinnerElement = null;
};

og.extend(og.control.LoadingSpinner, og.control.Control);

og.control.LoadingSpinner.prototype.init = function () {
    this.spinnerElement = document.createElement('div');
    this.spinnerElement.id = 'circleG';

    var a = document.createElement('div');
    var b = document.createElement('div');
    var c = document.createElement('div');
 
    this.spinnerElement.appendChild(a);
    this.spinnerElement.appendChild(b);
    this.spinnerElement.appendChild(c);

    a.id = "circleG_1"; a.className = "circleG";
    b.id = "circleG_2"; b.className = "circleG";
    c.id = "circleG_3"; c.className = "circleG";

    this.spinnerElement.className = "displayBlock";
    document.body.appendChild(this.spinnerElement);
    this.renderer.events.on("ondraw", this, this.draw);
};

og.control.LoadingSpinner.prototype.draw = function () {
    var spinning = false, 
        p = this.renderer.renderNodes.Earth,
        l = p.layers,
        i = 0;

    while(i < l.length) {
	if( l[i++].counter != 0 ) {
            spinning = true;
            break;
        }
    }

    if(p.terrainProvider.counter != 0 || spinning) {
        this.spinnerElement.className = "displayBlock";
    } else {
        this.spinnerElement.className = "displayNone";	
    }
};

