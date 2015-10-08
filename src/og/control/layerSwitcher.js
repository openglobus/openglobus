goog.provide('og.control.LayerSwitcher');

goog.require('og.inheritance');

og.control.LayerSwitcher = function (options) {
    og.inheritance.base(this, options);
    this.dialog = null;
    this.baseLayersDiv = null;
    this.overlaysDiv = null;
    this._id = og.control.LayerSwitcher.numSwitches++;
};

og.control.LayerSwitcher.numSwitches = 0;

og.inheritance.extend(og.control.LayerSwitcher, og.control.Control);

og.control.LayerSwitcher.prototype.init = function () {
    this.renderer.renderNodes.Earth.events.on("onlayeradded", this, this.onLayerAdded);
    this.renderer.renderNodes.Earth.events.on("onlayerremoved", this, this.onLayerRemoved);
    this.renderer.renderNodes.Earth.events.on("onbaselayerchanged", this, this.onBaseLayerChanged);
    this.renderer.renderNodes.Earth.events.on("onlayervisibilitychanged", this, this.onLayerVisibilityChanged);
    this.createSwitcher();
    this.createDialog();
};

og.control.LayerSwitcher.prototype.onLayerAdded = function (layer) {
    console.log("added");
};

og.control.LayerSwitcher.prototype.onLayerRemoved = function (layer) {
    console.log("removed");
};

og.control.LayerSwitcher.prototype.onBaseLayerChanged = function (layer) {
    console.log("basechanged");
};

og.control.LayerSwitcher.prototype.onLayerVisibilityChanged = function (layer) {
    console.log("changed " + layer.id);
};

og.control.LayerSwitcher.prototype.createBaseLayersDiv = function () {
    var layersDiv = document.createElement('div');
    layersDiv.className = "layersDiv";
    this.dialog.appendChild(layersDiv);

    var baseLayersLbl = document.createElement('div');
    baseLayersLbl.className = "layersDiv";
    baseLayersLbl.innerHTML = "Base Layer";
    layersDiv.appendChild(baseLayersLbl);

    this.baseLayersDiv = document.createElement('div');
    layersDiv.appendChild(this.baseLayersDiv);
    this.createBaseLayersList(this.baseLayersDiv);
};

og.control.LayerSwitcher.prototype.createOverlaysDiv = function () {
    var overlaysDiv = document.createElement('div');
    overlaysDiv.className = "layersDiv";
    this.dialog.appendChild(overlaysDiv);

    var overlaysLbl = document.createElement('div');
    overlaysLbl.className = "layersDiv";
    overlaysLbl.innerHTML = "Overlays";
    overlaysDiv.appendChild(overlaysLbl);

    this.overlaysDiv = document.createElement('div');
    overlaysDiv.appendChild(this.overlaysDiv);
    this.createOverlaysList(this.overlaysDiv);
};

og.control.LayerSwitcher.prototype.createDialog = function () {
    this.dialog = document.createElement('div');
    this.dialog.id = "ogLayerSwitcherDialog";
    this.dialog.className = "displayNone";
    this.renderer.div.appendChild(this.dialog);

    this.createBaseLayersDiv();
    this.createOverlaysDiv();
};

og.control.LayerSwitcher.prototype.createOverlaysList = function (block) {
    var i, inp, lbl, that = this,
        layers = this.renderer.renderNodes.Earth.layers;

    for (i = 0; i < layers.length; i++) {
        if (!layers[i].isBaseLayer) {
            inp = document.createElement('input');
            inp.type = "checkbox";
            inp.value = i;
            inp.checked = layers[i].visibility;
            inp.name = "ogBaseLayerCheckbox";
            inp.className = "ogLayerSwitcherInput";
            inp.onclick = function () { that.switchLayerVisibility.call(that, this); };
            block.appendChild(inp);

            lbl = document.createElement('label');
            lbl.className = "ogLayerSwitcherLabel";
            lbl.innerHTML = layers[i].name + "</br>";
            block.appendChild(lbl);
        }
    }
};

og.control.LayerSwitcher.prototype.createBaseLayersList = function (block) {
    var i, inp, lbl, that = this,
        layers = this.renderer.renderNodes.Earth.layers;

    for (i = 0; i < layers.length; i++) {
        if (layers[i].isBaseLayer) {
            inp = document.createElement('input');
            inp.type = "radio";
            inp.value = i;
            inp.checked = layers[i].visibility;
            inp.name = "ogBaseLayerRadiosId" + this._id;
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
    var rn = this.renderer.renderNodes.Earth;
    rn.setBaseLayer(rn.layers[obj.value]);
};

og.control.LayerSwitcher.prototype.switchLayerVisibility = function (obj) {
    var rn = this.renderer.renderNodes.Earth;
    var lr = rn.layers[obj.value];
    lr.setVisibility(lr.getVisibility() ? false : true);
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
    this.renderer.div.appendChild(button);
};

