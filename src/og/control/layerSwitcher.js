goog.provide('og.control.LayerSwitcher');

goog.require('og.inheritance');

/**
 * Simple(OpenLayers like)layer switcher, includes base layers, overlays, geo images etc. groups.
 * @class
 * @extends {og.control.BaseControl}
 * @param {Object} [options] - Control options.
 */
og.control.LayerSwitcher = function (options) {
    og.inheritance.base(this, options);
    this.dialog = null;
    this.baseLayersDiv = null;
    this.overlaysDiv = null;
    this._id = og.control.LayerSwitcher.numSwitches++;
};

og.control.LayerSwitcher.numSwitches = 0;

og.inheritance.extend(og.control.LayerSwitcher, og.control.BaseControl);

og.control.layerSwitcher = function (options) {
    return new og.control.LayerSwitcher(options);
};

og.control.LayerSwitcher.prototype.oninit = function () {
    this.renderer.renderNodes.Earth.events.on("layeradd", this, this.onLayerAdded);
    this.renderer.renderNodes.Earth.events.on("layerremove", this, this.onLayerRemoved);
    this.createSwitcher();
    this.createDialog();
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
    var lineDiv = document.createElement('div');

    var that = this;
    var center = document.createElement('div');
    center.classList.add('ogViewExtentBtn');
    center.onclick = function () {
        that.renderer.renderNodes.Earth.flyExtent(obj.getExtent());
    };

    var inp = document.createElement('input');
    inp.type = type;
    inp.name = "ogBaseLayerRadiosId" + (id || "");
    inp.checked = obj.getVisibility();
    inp.className = "ogLayerSwitcherInput";
    inp.onclick = function () {
        obj.setVisibility(this.checked);
    };

    obj.events && obj.events.on("visibilitychange", null, function (e) {
        inp.checked = e.getVisibility();
    });

    var lbl = document.createElement('label');
    lbl.className = "ogLayerSwitcherLabel";
    lbl.innerHTML = (obj.name || obj.src || "noname") + "</br>";

    obj._removeCallback = function () {
        container.removeChild(inp);
        container.removeChild(lbl);
    }

    lineDiv.appendChild(center);
    lineDiv.appendChild(inp);
    lineDiv.appendChild(lbl);

    container.appendChild(lineDiv);
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

og.control.LayerSwitcher.prototype.createDialog = function () {
    this.dialog = document.createElement('div');
    this.dialog.id = "ogLayerSwitcherDialog";
    this.dialog.className = "displayNone";
    this.renderer.div.appendChild(this.dialog);

    this.createBaseLayersContainer();
    this.createOverlaysContainer();
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

