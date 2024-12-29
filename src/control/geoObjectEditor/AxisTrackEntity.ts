import {Entity, IEntityParams} from "../../entity/Entity";
import {Vec3} from "../../math/Vec3";
import {SEL_X_COLOR, SEL_Y_COLOR, SEL_Z_COLOR} from "./colors";
import {LonLat} from "../../LonLat";
import {htmlColorToFloat32Array} from "../../utils/shared";
import {SegmentPathColor} from "../../entity/Polyline";
import {GeoObjectEditorScene} from "./GeoObjectEditorScene";

const SEG_SIZE = 20;

export interface IAxisTrackEntityParams extends IEntityParams {
}

export class AxisTrackEntity extends Entity {

    constructor(params: IAxisTrackEntityParams = {}) {
        super(params);
        this._init();
    }

    private _init() {

        const length = SEG_SIZE;

        let lonColors: SegmentPathColor = [],
            latCoords: SegmentPathColor = [],
            yColors: SegmentPathColor = [];

        let lonCol = htmlColorToFloat32Array(SEL_X_COLOR),
            yCol = htmlColorToFloat32Array(SEL_Y_COLOR),
            latCol = htmlColorToFloat32Array(SEL_Z_COLOR);


        for (let i = 0; i < length; i++) {
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
                pathColors: [lonColors],
                isClosed: false
            }
        });

        let axisY = new Entity({
            polyline: {
                path3v: [Array.from({length}, (_, i) => new Vec3())],
                thickness: 2.5,
                pathColors: [yColors],
                isClosed: false
            }
        });

        let axisZ = new Entity({
            polyline: {
                path3v: [Array.from({length}, (_, i) => new Vec3())],
                thickness: 2.5,
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

        if (this._entityCollection && this._entityCollection.renderNode) {

            let rn = this._entityCollection.renderNode as GeoObjectEditorScene;
            let cam = rn.renderer!.activeCamera;
            let r = cam.eye.distance(cart) * 0.05;

            if (rn.planet) {

                let yCoords: Vec3[] = [],
                    lonCoords: LonLat[] = [],
                    latCoords: LonLat[] = [];

                let n = rn.planet.ellipsoid.getSurfaceNormal3v(cart);

                let ll = this._lonLat;

                let size = SEG_SIZE / 2;
                for (let i = -size; i < size; i++) {
                    latCoords.push(new LonLat(ll.lon, ll.lat + i, ll.height));
                    lonCoords.push(new LonLat(ll.lon + i, ll.lat, ll.height));
                    yCoords.push(cart.add(n.scaleTo(i * r)));
                }

                this.childrenNodes[0].polyline!.setPathLonLatFast([lonCoords],);
                this.childrenNodes[1].polyline!.setPath3vFast([yCoords]);
                this.childrenNodes[2].polyline!.setPathLonLatFast([latCoords]);

            } else {

                let zCoords: Vec3[] = [],
                    xCoords: Vec3[] = [],
                    yCoords: Vec3[] = [];

                let y = Vec3.UNIT_Y,
                    x = Vec3.UNIT_X,
                    z = Vec3.UNIT_Z;

                let size = SEG_SIZE / 2;
                for (let i = -size; i < size; i++) {
                    xCoords.push(cart.add(x.scaleTo(i * r)));
                    yCoords.push(cart.add(y.scaleTo(i * r)));
                    zCoords.push(cart.add(z.scaleTo(i * r)));
                }

                this.childrenNodes[0].polyline!.setPath3vFast([xCoords]);
                this.childrenNodes[1].polyline!.setPath3vFast([yCoords]);
                this.childrenNodes[2].polyline!.setPath3vFast([zCoords]);
            }
        }
    }
}