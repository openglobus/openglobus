goog.provide('og.control.LoadingSpinner');

goog.require('og.control.Control');
goog.require('og._class_');

og.control.LoadingSpinner = function (options) {
    og.control.LoadingSpinner.superclass.constructor.call(this, options);
    this.spinnerElement = null;
};

og._class_.extend(og.control.LoadingSpinner, og.control.Control);

og.control.LoadingSpinner.prototype.init = function () {
    this.spinnerElement = document.createElement('div');
    this.spinnerElement.innerHTML = "Loading...";
    this.spinnerElement.id = 'ogLoadingSpinner';
    this.spinnerElement.className = "displayBlock";
    document.body.appendChild(this.spinnerElement);
};

og.control.LoadingSpinner.prototype.draw = function () {
    var spinning = false, 
        p = this.renderer.renderNodes[0],
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

