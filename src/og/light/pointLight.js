goog.provide('og.light.PointLight');

goog.require('og.math.Vector3');

og.light.PointLight = function (name, position, ambient, diffuse, specular, shininess) {
    this._name = name || ("p" + og.light.PointLight._counter++);
    this._renderNode = null;

    this._position = position || new og.math.Vector3();

    this._ambient = ambient || new og.math.Vector3();
    this._diffuse = diffuse || new og.math.Vector3(0.8, 0.8, 0.8);
    this._specular = specular || new og.math.Vector3(0.18, 0.18, 0.18);

    this._shininess = shininess || 3.3;

    this._active = true;

    this._tempAmbient = ambient ? ambient.clone() : new og.math.Vector3();
    this._tempDiffuse = diffuse ? diffuse.clone() : new og.math.Vector3();
    this._tempSpecular = specular ? specular.clone() : new og.math.Vector3();
    this._tempShininess = shininess || 1.0;
};

og.light.PointLight._counter = 0;

og.light.PointLight.prototype.clone = function () {

};

og.light.PointLight.prototype.setActive = function (active) {
    if (active && !this._active) {
        var rn = this._renderNode;
        if (rn) {
            var index = rn._pointLightsNames.indexOf(this._name);
            this._shininess = rn._pointLightsParamsf[index] = this._tempShininess;
            if (index != -1) {
                index *= 9;
                this._ambient.x = rn._pointLightsParamsv[index] = this._tempAmbient.x;
                this._ambient.y = rn._pointLightsParamsv[index + 1] = this._tempAmbient.y;
                this._ambient.z = rn._pointLightsParamsv[index + 2] = this._tempAmbient.z;
                this._diffuse.x = rn._pointLightsParamsv[index + 3] = this._tempDiffuse.x;
                this._diffuse.y = rn._pointLightsParamsv[index + 4] = this._tempDiffuse.y;
                this._diffuse.z = rn._pointLightsParamsv[index + 5] = this._tempDiffuse.z;
                this._specular.x = rn._pointLightsParamsv[index + 6] = this._tempSpecular.x;
                this._specular.y = rn._pointLightsParamsv[index + 7] = this._tempSpecular.y;
                this._specular.z = rn._pointLightsParamsv[index + 8] = this._tempSpecular.z;
            }
        }
        this._active = true;
    } else if (!active && this._active) {
        this._tempAmbient = this._ambient.clone();
        this._tempDiffuse = this._diffuse.clone();
        this._tempSpecular = this._specular.clone();
        this._tempShininess = this._shininess;
        this.setBlack();
        this._active = false;
    }
    return this.active;
};

og.light.PointLight.prototype.isActive = function () {
    return this._active;
};


og.light.PointLight.prototype.setPosition = function (position) {
    this._position = position;
    return this;
};

og.light.PointLight.prototype.setAmbient = function (rgb) {
    this._ambient = rgb;
    var rn = this._renderNode;
    if (rn) {
        var index = 9 * rn._pointLightsNames.indexOf(this._name);
        if (index != -1) {
            rn._pointLightsParamsv[index] = rgb.x;
            rn._pointLightsParamsv[index + 1] = rgb.y;
            rn._pointLightsParamsv[index + 2] = rgb.z;
        }
    }
    return this;
};

og.light.PointLight.prototype.setDiffuse = function (rgb) {
    this._diffuse = rgb;
    var rn = this._renderNode;
    if (rn) {
        var index = 9 * rn._pointLightsNames.indexOf(this._name);
        if (index != -1) {
            rn._pointLightsParamsv[index + 3] = rgb.x;
            rn._pointLightsParamsv[index + 4] = rgb.y;
            rn._pointLightsParamsv[index + 5] = rgb.z;
        }
    }
    return this;
};

og.light.PointLight.prototype.setSpecular = function (rgb) {
    this._specular = rgb;
    var rn = this._renderNode;
    if (rn) {
        var index = 9 * rn._pointLightsNames.indexOf(this._name);
        if (index != -1) {
            rn._pointLightsParamsv[index + 6] = rgb.x;
            rn._pointLightsParamsv[index + 7] = rgb.y;
            rn._pointLightsParamsv[index + 8] = rgb.z;
        }
    }
    return this;
};

og.light.PointLight.prototype.setShininess = function (shininess) {
    this._shininess = shininess;
    var rn = this._renderNode;
    if (rn) {
        var index = rn._pointLightsNames.indexOf(this._name);
        if (index != -1) {
            rn._pointLightsParamsf[index] = shininess;
        }
    }
    return this;
};

og.light.PointLight.prototype.setBlack = function () {
    this._ambient.clear();
    this._diffuse.clear();
    this._specular.clear();
    this._shininess = 0;
    var rn = this._renderNode;
    if (rn) {
        var index = 9 * rn._pointLightsNames.indexOf(this._name);
        if (index != -1) {
            rn._pointLightsParamsv[index] = rn._pointLightsParamsv[index + 1] = rn._pointLightsParamsv[index + 2] =
            rn._pointLightsParamsv[index + 3] = rn._pointLightsParamsv[index + 4] = rn._pointLightsParamsv[index + 5] =
            rn._pointLightsParamsv[index + 6] = rn._pointLightsParamsv[index + 7] = rn._pointLightsParamsv[index + 8] = 0;
        }
    }
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
    if (rn) {
        var li = rn.getLightById(this._name);
        if (li != -1) {
            rn._pointLights.splice(li, 1);
            rn._pointLightsNames.splice(li, 1);
            rn._pointLightsParamsf.splice(li, 1);
            rn._pointLightsParamsv.splice(li, 9);//3*3
        }
    }
    this._renderNode = null;
};