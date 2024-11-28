import {Vec3} from "../math/Vec3";
import {RenderNode} from "../scene/RenderNode";

export interface ILightSourceParams {
    position?: Vec3;
    ambient?: Vec3;
    diffuse?: Vec3;
    specular?: Vec3;
    shininess?: number;
}

class LightSource {

    protected _renderNode: RenderNode | null;

    public _position: Vec3;

    protected _ambient: Vec3;
    protected _diffuse: Vec3;
    protected _specular: Vec3;
    protected _shininess: number;
    protected _active: boolean;
    protected _tempAmbient: Vec3;
    protected _tempDiffuse: Vec3;
    protected _tempSpecular: Vec3;
    protected _tempShininess: number;

    constructor(params: ILightSourceParams) {

        this._renderNode = null;
        this._position = params.position || new Vec3();
        this._ambient = params.ambient || new Vec3();
        this._diffuse = params.diffuse || new Vec3(0.8, 0.8, 0.8);
        this._specular = params.specular || new Vec3(0.18, 0.18, 0.18);
        this._shininess = params.shininess != undefined ? params.shininess : 3.3;
        this._active = true;

        this._tempAmbient = this._ambient.clone();
        this._tempDiffuse = this._diffuse.clone();
        this._tempSpecular = this._specular.clone();
        this._tempShininess = this._shininess;
    }

    public isActive(): boolean {
        return this._active;
    }

    public setPosition3v(position: Vec3) {
        this.setPosition(position.x, position.y, position.z);
    }

    public setPosition(x: number, y: number, z: number) {
        this._position.x = x;
        this._position.y = y;
        this._position.z = z;
        if (this._renderNode) {
            this._renderNode._lightPosition[0] = x;
            this._renderNode._lightPosition[1] = y;
            this._renderNode._lightPosition[2] = z;
        }
    }

    public getPosition(): Vec3 {
        return this._position.clone();
    }

    public setAmbient3v(rgb: Vec3) {
        this.setAmbient(rgb.x, rgb.y, rgb.z);
    }

    public setDiffuse3v(rgb: Vec3) {
        this.setDiffuse(rgb.x, rgb.y, rgb.z);
    }

    public setSpecular3v(rgb: Vec3) {
        this.setSpecular(rgb.x, rgb.y, rgb.z);
    }

    public setAmbient(r: number, g: number, b: number) {
        this._ambient.set(r, g, b);
        const rn = this._renderNode;
        if (rn) {
            rn._lightParams[0] = r;
            rn._lightParams[1] = g;
            rn._lightParams[2] = b;
        }
    }

    public setDiffuse(r: number, g: number, b: number) {
        this._diffuse.set(r, g, b);
        const rn = this._renderNode;
        if (rn) {
            rn._lightParams[3] = r;
            rn._lightParams[4] = g;
            rn._lightParams[5] = b;
        }
    }

    public setSpecular(r: number, g: number, b: number) {
        this._specular.set(r, g, b);
        const rn = this._renderNode;
        if (rn) {
            rn._lightParams[6] = r;
            rn._lightParams[7] = g;
            rn._lightParams[8] = b;
        }
    }

    public setShininess(shininess: number) {
        this._shininess = shininess;
        const rn = this._renderNode;
        if (rn) {
            rn._lightShininess = shininess;
        }
    }

    public addTo(renderNode: RenderNode) {
        this._renderNode = renderNode;
        this.setShininess(this._shininess);
        this.setAmbient3v(this._ambient);
        this.setDiffuse3v(this._diffuse);
        this.setSpecular3v(this._specular);
    }
}

export {LightSource};
