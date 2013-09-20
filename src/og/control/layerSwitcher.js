goog.provide('og.control.LayerSwitcher');

goog.require('og._class_');

og.control.LayerSwitcher = function (options) {
    og.control.LayerSwitcher.superclass.constructor.call(this, options);
    this.dialog = null;
    this.baseLayersDiv = null;
};

og._class_.extend(og.control.LayerSwitcher, og.control.Control);

og.control.LayerSwitcher.prototype.init = function () {
    this.createSwitcher();
    this.createDialog();
};

og.control.LayerSwitcher.prototype.draw = function () {
};

og.control.LayerSwitcher.prototype.createDialog = function () {
    this.dialog = document.createElement('div');
    this.dialog.id = "ogLayerSwitcherDialog";
    this.dialog.className = "displayNone";
    document.body.appendChild(this.dialog);

    var layersDiv = document.createElement('div');
    layersDiv.className = "layersDiv";
    this.dialog.appendChild(layersDiv);

    var baseLayersLbl = document.createElement('div');
    baseLayersLbl.className = "layersDiv";
    baseLayersLbl.innerHTML = "Base Layer";
    layersDiv.appendChild(baseLayersLbl);

    this.baseLayersDiv = document.createElement('div');
    baseLayersLbl.className = "layersDiv";
    layersDiv.appendChild(this.baseLayersDiv);
    this.createBaseLayersList(this.baseLayersDiv);
};

og.control.LayerSwitcher.prototype.createBaseLayersList = function (block) {
    var i, inp, lbl, that = this,
        layers = this.renderer.renderNodes[0].layers;

    for (i = 0; i < layers.length; i++) {
        if (layers[i].isBaseLayer) {
            inp = document.createElement('input');
            inp.type = "radio";
            inp.value = i;
            inp.checked = layers[i].visibility;
            inp.name = "ogBaseLayerCheckbox";
            inp.className = "ogLayerSwitcherInput";
            inp.onclick = function () { that.switchLayer.call(that, this); };
            block.appendChild(inp);

            lbl = document.createElement('label');
            lbl.className = "ogLayerSwitcherLabel";
            lbl.innerHTML = layers[i].name + "</br>";
            block.appendChild(lbl);
        }
    }
};

og.control.LayerSwitcher.prototype.switchLayer = function (obj) {
    var rn = this.renderer.renderNodes[0];
    rn.setBaseLayer(rn.layers[obj.value]);
};

og.control.LayerSwitcher.prototype.createSwitcher = function () {
    var button = document.createElement('div');
    button.className = 'ogLayerSwitcherButton';
    button.id = "ogLayerSwitcherButtonMaximize";
    var that = this;
    button.onclick = function (e) {
        if (this.id === "ogLayerSwitcherButtonMaximize") {
            this.id = "ogLayerSwitcherButtonMinimize";
            that.dialog.className = "displayBlock";
        } else {
            this.id = "ogLayerSwitcherButtonMaximize";
            that.dialog.className = "displayNone";
        }
    };
    document.body.appendChild(button);
};

