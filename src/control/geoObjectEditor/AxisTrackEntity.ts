import {Entity, IEntityParams} from "../../entity/Entity";
import {Vec3} from "../../math/Vec3";
import {SEL_X_COLOR, SEL_Y_COLOR, SEL_Z_COLOR} from "./colors";
import {LonLat} from "../../LonLat";
import {htmlColorToFloat32Array} from "../../utils/shared";

const SEG_SIZE = 100;

export interface IAxisTrackEntityParams extends IEntityParams {
}

export class AxisTrackEntity extends Entity {

    constructor(params: IAxisTrackEntityParams = {}) {
        super(params);
        this._init();
    }

    private _init() {

        const length = SEG_SIZE;

        let lonColors = [],
            latCoords = [],
            yColors = [];

        let lonCol = htmlColorToFloat32Array(SEL_X_COLOR),
            yCol = htmlColorToFloat32Array(SEL_Y_COLOR),
            latCol = htmlColorToFloat32Array(SEL_Z_COLOR);


        for (let i = 0; i < 20; i++) {
            let op = 1;
            if (i < 5) {
                let t = i / 5;
                op = 0.5 * (1 - Math.cos(Math.PI * t));
            } else if (i > 15) {
                let t = (i - 15) / 5;
                op = 1 - 0.5 * (1 - Math.cos(Math.PI * t));
            }
            latCoords.push([latCol[0], latCol[1], latCol[2], op]);
            lonColors.push([lonCol[0], lonCol[1], lonCol[2], op]);
            yColors.push([yCol[0], yCol[1], yCol[2], op]);
        }

        let axisX = new Entity({
            polyline: {
                path3v: [Array.from({length}, (_, i) => new Vec3())],
                thickness: 2.5,
                //color: SEL_X_COLOR,
                pathColors: [lonColors],
                isClosed: false
            }
        });

        let axisY = new Entity({
            polyline: {
                path3v: [Array.from({length}, (_, i) => new Vec3())],
                thickness: 2.5,
                //color: SEL_Y_COLOR,
                pathColors: [yColors],
                isClosed: false
            }
        });

        let axisZ = new Entity({
            polyline: {
                path3v: [Array.from({length}, (_, i) => new Vec3())],
                thickness: 2.5,
                //color: SEL_Z_COLOR,
                pathColors: [latCoords],
                isClosed: false
            }
        });

        this.appendChild(axisX);
        this.appendChild(axisY);
        this.appendChild(axisZ);
    }

    public override setCartesian3v(cart: Vec3) {

        super.setCartesian3v(cart);

        if (this._layer && this._layer._planet) {

            let pl = this._layer._planet;
            // let qNorthFrame = pl.getNorthFrameRotation(cart).conjugate();
            let r = pl.camera.eye.distance(cart) * 0.05;

            let yCoords: Vec3[] = [],
                lonCoords: LonLat[] = [],
                latCoords: LonLat[] = [];

            let n = pl!.ellipsoid.getSurfaceNormal3v(cart);
            let ll = this._lonLat;

            for (let i = -10; i < 10; i++) {
                latCoords.push(new LonLat(ll.lon, ll.lat + i, ll.height));
                lonCoords.push(new LonLat(ll.lon + i, ll.lat, ll.height));
                yCoords.push(cart.add(n.scaleTo(i * r)));
            }

            this.childrenNodes[0].polyline!.setPathLonLat([lonCoords], undefined, true);
            this.childrenNodes[1].polyline!.setPath3v([yCoords], undefined, true);
            this.childrenNodes[2].polyline!.setPathLonLat([latCoords], undefined, true);
        }
    }
}