import { Control } from "./Control";
import type { IControlParams } from "./Control";
import { htmlColorToRgb, rgbToStringHTML } from "../utils/shared";
import { Program } from "../webgl/Program";
import type { NumberArray3 } from "../math/Vec3";

interface ISimpleSkyBackgroundParams extends IControlParams {}

export class SimpleSkyBackground extends Control {
    protected _colorOne: Float32Array;
    protected _colorTwo: Float32Array;

    constructor(options: ISimpleSkyBackgroundParams = {}) {
        super({
            name: "SimpleSkyBackground",
            ...options
        });

        this._colorOne = new Float32Array([128 / 255, 223 / 255, 255 / 255]);
        this._colorTwo = new Float32Array([10 / 255, 15 / 255, 56 / 255]);
    }

    public get colorOne(): string {
        let c = this._colorOne;
        let arr: NumberArray3 = [Math.round(c[0] * 255), Math.round(c[1] * 255), Math.round(c[2] * 255)];
        return rgbToStringHTML(arr);
    }

    public get colorTwo(): string {
        let c = this._colorTwo;
        let arr: NumberArray3 = [Math.round(c[0] * 255), Math.round(c[1] * 255), Math.round(c[2] * 255)];
        return rgbToStringHTML(arr);
    }

    public set colorOne(htmlColor: string) {
        let rgb = htmlColorToRgb(htmlColor);
        this._colorOne[0] = rgb.x;
        this._colorOne[1] = rgb.y;
        this._colorOne[2] = rgb.z;
    }

    public set colorTwo(htmlColor: string) {
        let rgb = htmlColorToRgb(htmlColor);
        this._colorTwo[0] = rgb.x;
        this._colorTwo[1] = rgb.y;
        this._colorTwo[2] = rgb.z;
    }

    public override oninit() {
        this.renderer!.handler.addProgram(simpleSkyBackgroundShader());
        this.activate();
    }

    public override onactivate() {
        super.onactivate();
        this.planet!.events.on("draw", this._drawBackground, this);
    }

    public override ondeactivate() {
        super.ondeactivate();
        this.planet!.events.off("draw", this._drawBackground);
    }

    protected _drawBackground() {
        let h = this.renderer!.handler;
        let sh = h.programs.simpleSkyBackground,
            p = sh._program,
            shu = p.uniforms,
            gl = h.gl!;
        let cam = this.planet!.camera;

        gl.disable(gl.DEPTH_TEST);

        sh.activate();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.renderer!.screenFramePositionBuffer!);
        gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);

        gl.uniform3fv(shu.camPos, [cam.eye.x, cam.eye.y, cam.eye.z]);
        gl.uniform2fv(shu.iResolution, [h.getWidth(), h.getHeight()]);
        gl.uniform1f(shu.fov, cam.getViewAngle());
        gl.uniform1f(shu.earthRadius, this.planet!.ellipsoid.getPolarSize() + 1);
        gl.uniform3fv(shu.colorOne, this._colorOne);
        gl.uniform3fv(shu.colorTwo, this._colorTwo);
        gl.uniformMatrix3fv(shu.normalMatrix, false, cam.getNormalMatrix());

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.enable(gl.DEPTH_TEST);
    }
}

function simpleSkyBackgroundShader(): Program {
    return new Program("simpleSkyBackground", {
        uniforms: {
            iResolution: "vec2",
            fov: "float",
            camPos: "vec3",
            earthRadius: "float",
            normalMatrix: "mat3",
            colorOne: "vec3",
            colorTwo: "vec3"
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader: `attribute vec2 corners;
                        
            varying vec2 tc;
            
            void main(void) {
                gl_Position = vec4(corners, 0.0, 1.0);
                tc = corners * 0.5 + 0.5;
            }`,
        fragmentShader: `precision highp float;
            
            #define MAX 10e10
            #define PI 3.14159265359
            #define rad(x) x * PI / 180.
            #define ZERO vec3(0.0)          
           
            #define RED vec4(1.0, 0.0, 0.0, 1.0)
            #define GREEN vec4(0.0, 1.0, 0.0, 1.0)         
            
            uniform vec3 camPos;            
            uniform vec2 iResolution;
            uniform float fov;
            uniform float earthRadius;
            uniform mat3 normalMatrix;
            
            uniform vec3 colorOne;
            uniform vec3 colorTwo;
                         
            varying vec2 tc;
                        
            // compute the view ray in the camera coordinate
            vec3 computeView(vec2 uv){
                float w_h_ratio = iResolution.x / iResolution.y;   
                float h = tan(rad(fov/2.));
                return normalize(vec3(-w_h_ratio * h, -h, -1.) + vec3(uv.x * 2. * h * w_h_ratio, uv.y*2.*h, 0.));
            }

            // sphere of size ra centered at point ce
            vec2 sphIntersect( in vec3 ro, in vec3 rd, in vec3 ce, float ra )
            {
                vec3 oc = ro - ce;
                float b = dot( oc, rd );
                float c = dot( oc, oc ) - ra * ra;
                float h = b * b - c;
                if( h < 0.0 ) return vec2(MAX); // no intersection
                h = sqrt( h );
                return vec2( -b-h, -b+h );
            }
            
            void main(void) {
            
                vec3 dir = computeView(tc);
                dir = normalMatrix * dir;
                
                vec2 ER = sphIntersect(camPos, dir, vec3(0.0), earthRadius);
                
                float bigRadius = earthRadius * 2.5;
                vec3 bigCenter = normalize(camPos) * bigRadius * 1.3;                
                               
                vec2 BIG = sphIntersect(camPos, dir, bigCenter, bigRadius);
                
                float Ix = distance(camPos + dir * BIG.y, ZERO);               
                
                float maxI = sqrt(bigRadius * bigRadius + bigRadius * bigRadius);
                                   
                gl_FragColor = vec4(mix(colorOne, colorTwo, Ix / maxI), 1.0);
            }`
    });
}
