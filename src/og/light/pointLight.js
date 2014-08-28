goog.provide('og.light.PointLight');

goog.require('og.math.Vector3');

og.light.PointLight = function (name, position, ambient, diffuse, specular, shininess) {
    this._name = name || ("p" + og.light.PointLight._counter++);
    this._renderNode = null;

    this._position = position || new og.math.Vector3()

    this._ambient = ambient || new og.math.Vector3();
    this._diffuse = diffuse || new og.math.Vector3(0.8, 0.8, 0.8);
    this._specular = specular || new og.math.Vector3(0.18, 0.18, 0.18);

    this._shininess = shininess || 3.3;
};

og.light.PointLight._counter = 0;

og.light.PointLight.prototype.setPosition = function (position) {
    this._position = position;
    return this;
};

og.light.PointLight.prototype.setAmbient = function (rgb) {
    this._ambient = rgb;
    var rn = this._renderNode;
    var index = 9 * rn._pointLightsNames.indexOf(this._name);
    rn._pointLightsParamsv[index] = rgb.x;
    rn._pointLightsParamsv[index + 1] = rgb.y;
    rn._pointLightsParamsv[index + 2] = rgb.z;
    return this;
};

og.light.PointLight.prototype.setDiffuse = function (rgb) {
    this._diffuse = rgb;
    var rn = this._renderNode;
    var index = 9 * rn._pointLightsNames.indexOf(this._name);
    rn._pointLightsParamsv[index + 3] = rgb.x;
    rn._pointLightsParamsv[index + 4] = rgb.y;
    rn._pointLightsParamsv[index + 5] = rgb.z;
    return this;
};

og.light.PointLight.prototype.setSpecular = function (rgb) {
    this._specular = rgb;
    var rn = this._renderNode;
    var index = 9 * rn._pointLightsNames.indexOf(this._name);
    rn._pointLightsParamsv[index + 6] = rgb.x;
    rn._pointLightsParamsv[index + 7] = rgb.y;
    rn._pointLightsParamsv[index + 8] = rgb.z;
    return this;
};

og.light.PointLight.prototype.setShininess = function (shininess) {
    this._shininess = shininess;
    var rn = this._renderNode;
    rn._pointLightsParamsf[rn._pointLightsNames.indexOf(this._name)] = shininess;
    return this;
};

og.light.PointLight.prototype.setBlack = function () {
    this._ambient.clear();
    this._diffuse.clear();
    this._specular.clear();
    this._shininess = 0;
    var rn = this._renderNode;
    var index = 9 * rn._pointLightsNames.indexOf(this._name);
    rn._pointLightsParamsv[index] = rn._pointLightsParamsv[index + 1] = rn._pointLightsParamsv[index + 2] = 
    rn._pointLightsParamsv[index + 3] = rn._pointLightsParamsv[index + 4] = rn._pointLightsParamsv[index + 5] = 
    rn._pointLightsParamsv[index + 6] = rn._pointLightsParamsv[index + 7] = rn._pointLightsParamsv[index + 8] = 0;
    return this;
};

og.light.PointLight.prototype.addTo = function (renderNode) {
    this._renderNode = renderNode;
    renderNode._pointLights.push(this);
    renderNode._pointLightsNames.push(this._name);
    renderNode._pointLightsParamsf.push(this._shininess);
    renderNode._pointLightsParamsv.push.apply(renderNode._pointLightsParamsv, this._ambient.toVec());
    renderNode._pointLightsParamsv.push.apply(renderNode._pointLightsParamsv, this._diffuse.toVec());
    renderNode._pointLightsParamsv.push.apply(renderNode._pointLightsParamsv, this._specular.toVec());
    return this;
};

og.light.PointLight.prototype.remove = function () {
    var rn = this.renderNode;
    var li = rn.getLightById(this._name);
    rn._pointLights.splice(li, 1);
    rn._pointLightsNames.splice(li, 1);
    rn._pointLightsParamsf.splice(li, 1);
    rn._pointLightsParamsv.splice(li, 9);//3*3
    this._renderNode = null;
};