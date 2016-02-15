goog.provide('og.control.LayerSwitcher');

goog.require('og.inheritance');

og.control.LayerSwitcher = function (options) {
    og.inheritance.base(this, options);
    this.dialog = null;
    this.baseLayersDiv = null;
    this.overlaysDiv = null;
    this.geoImagesDiv = null;
    this._id = og.control.LayerSwitcher.numSwitches++;
};

og.control.LayerSwitcher.numSwitches = 0;

og.inheritance.extend(og.control.LayerSwitcher, og.control.Control);

og.control.LayerSwitcher.prototype.init = function () {
    this.renderer.renderNodes.Earth.events.on("layeradd", this, this.onLayerAdded);
    this.renderer.renderNodes.Earth.events.on("layerremove", this, this.onLayerRemoved);
    this.renderer.renderNodes.Earth.events.on("geoimageadd", this, this.onGeoImageAdded);
    this.createSwitcher();
    this.createDialog();
};

og.control.LayerSwitcher.prototype.onGeoImageAdded = function (geoImage) {
    this.addSwitcher("checkbox", geoImage, this.geoImagesDiv, this._id);
};

og.control.LayerSwitcher.prototype.onLayerAdded = function (layer) {
    if (layer.isBaseLayer()) {
        this.addSwitcher("radio", layer, this.baseLayersDiv);
    } else {
        this.addSwitcher("checkbox", layer, this.overlaysDiv, this._id);
    }
};

og.control.LayerSwitcher.prototype.onLayerRemoved = function (layer) {
    layer._removeCallback();
    layer._removeCallback = null;
};

og.control.LayerSwitcher.prototype.addSwitcher = function (type, obj, container, id) {
    var inp = document.createElement('input');
    inp.type = type;
    inp.name = "ogBaseLayerRadiosId" + (id || "");
    inp.checked = obj.getVisibility();
    inp.className = "ogLayerSwitcherInput";
    var that = this;
    inp.onclick = function () {
        obj.setVisibility(this.checked);
    };

    obj.events.on("visibilitychange", null, function (e) {
        inp.checked = e.getVisibility();
    });

    var lbl = document.createElement('label');
    lbl.className = "ogLayerSwitcherLabel";
    lbl.innerHTML = (obj.name || obj.src || "noname") + "</br>";

    obj._removeCallback = function () {
        container.removeChild(inp);
        container.removeChild(lbl);
    }

    container.appendChild(inp);
    container.appendChild(lbl);
};

og.control.LayerSwitcher.prototype.createBaseLayersContainer = function () {
    var layersDiv = document.createElement('div');
    layersDiv.className = "layersDiv";
    this.dialog.appendChild(layersDiv);

    var baseLayersLbl = document.createElement('div');
    baseLayersLbl.className = "layersDiv";
    baseLayersLbl.innerHTML = "Base Layer";
    layersDiv.appendChild(baseLayersLbl);

    this.baseLayersDiv = document.createElement('div');
    layersDiv.appendChild(this.baseLayersDiv);
};

og.control.LayerSwitcher.prototype.createOverlaysContainer = function () {
    var overlaysDiv = document.createElement('div');
    overlaysDiv.className = "layersDiv";
    this.dialog.appendChild(overlaysDiv);

    var overlaysLbl = document.createElement('div');
    overlaysLbl.className = "layersDiv";
    overlaysLbl.innerHTML = "Overlays";
    overlaysDiv.appendChild(overlaysLbl);

    this.overlaysDiv = document.createElement('div');
    overlaysDiv.appendChild(this.overlaysDiv);
};

og.control.LayerSwitcher.prototype.createGeoImagesContainer = function () {
    var geoImagesDiv = document.createElement('div');
    geoImagesDiv.className = "layersDiv";
    this.dialog.appendChild(geoImagesDiv);

    var overlaysLbl = document.createElement('div');
    overlaysLbl.className = "layersDiv";
    overlaysLbl.innerHTML = "Geo Images";
    geoImagesDiv.appendChild(overlaysLbl);

    this.geoImagesDiv = document.createElement('div');
    geoImagesDiv.appendChild(this.geoImagesDiv);
};

og.control.LayerSwitcher.prototype.createDialog = function () {
    this.dialog = document.createElement('div');
    this.dialog.id = "ogLayerSwitcherDialog";
    this.dialog.className = "displayNone";
    this.renderer.div.appendChild(this.dialog);

    this.createBaseLayersContainer();
    this.createOverlaysContainer();
    this.createGeoImagesContainer();
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

