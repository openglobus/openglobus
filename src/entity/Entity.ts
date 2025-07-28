import * as mercator from "../mercator";
import * as utils from "../utils/shared";
import {Billboard} from "./Billboard";
import {EntityCollection} from "./EntityCollection";
import type {IBillboardParams} from "./Billboard";
import type {EntityCollectionEvents} from "./EntityCollection";
import {Extent} from "../Extent";
import {Geometry} from "./Geometry";
import {GeoObject} from "./GeoObject";
import type {IGeometryParams} from "./Geometry";
import type {IGeoObjectParams} from "./GeoObject";
import {LonLat} from "../LonLat";
import {Label} from "./Label";
import type {ILabelParams} from "./Label";
import {Vec3} from "../math/Vec3";
import type {NumberArray3} from "../math/Vec3";
import type {NumberArray2} from "../math/Vec2";
import {Planet} from "../scene/Planet";
import {PointCloud} from "./PointCloud";
import {Polyline} from "./Polyline";
import type {IPointCloudParams} from "./PointCloud";
import type {IPolylineParams} from "./Polyline";
import {Ray} from "./Ray";
import type {IRayParams} from "./Ray";
import {Strip} from "./Strip";
import type {IStripParams} from "./Strip";
import {Vector} from "../layer/Vector";
import type {VectorEventsType} from "../layer/Vector";
import {EntityCollectionNode} from "../quadTree/EntityCollectionNode";
import {Quat} from "../math/Quat";
import {clamp} from "../math";

/**
 * Interface for Entity parameters.
 * @typedef {Object} IEntityParams
 * @property {string} [name] - Name of the entity.
 * @property {any} [properties] - Additional properties of the entity.
 * @property {Vec3 | NumberArray3} [cartesian] - Cartesian position.
 * @property {LonLat | NumberArray3 | NumberArray2} [lonlat] - Geographic coordinates.
 * @property {number} [altitude] - Altitude.
 * @property {boolean} [visibility] - Visibility flag.
 * @property {Billboard | IBillboardParams} [billboard] - Billboard object or parameters.
 * @property {Label | ILabelParams} [label] - Label object or parameters.
 * @property {Polyline | IPolylineParams} [polyline] - Polyline object or parameters.
 * @property {Ray | IRayParams} [ray] - Ray object or parameters.
 * @property {PointCloud | IPointCloudParams} [pointCloud] - Point cloud object or parameters.
 * @property {Geometry | IGeometryParams} [geometry] - Geometry object or parameters.
 * @property {GeoObject | IGeoObjectParams} [geoObject] - Geo object or parameters.
 * @property {Strip | IStripParams} [strip] - Strip object or parameters.
 * @property {boolean} [independentPicking] - Independent picking flag.
 * @property {boolean} [relativePosition] - Parent relative position flag, otherwise position is absolute.
 * @property {number} [pitch] - Rotation around local X-axis.
 * @property {number} [yaw] - Rotation around local Y-axis.
 * @property {number} [roll] - Rotation around local Z-axis.
 * @property {number | Vec3 | NumberArray3} [scale] - Scaling factor.
 * @property {boolean} [forceGlobalPosition] - Forces global position for entity make the same position as its parent.
 * @property {boolean} [forceGlobalRotation] - Forces global rotation for the entity make the same rotation as its parent.
 */
export interface IEntityParams {
    name?: string;
    properties?: any;
    cartesian?: Vec3 | NumberArray3;
    lonlat?: LonLat | NumberArray3 | NumberArray2;
    altitude?: number;
    visibility?: boolean;
    billboard?: Billboard | IBillboardParams;
    label?: Label | ILabelParams;
    polyline?: Polyline | IPolylineParams;
    ray?: Ray | IRayParams;
    pointCloud?: PointCloud | IPointCloudParams;
    geometry?: Geometry | IGeometryParams;
    geoObject?: GeoObject | IGeoObjectParams;
    strip?: Strip | IStripParams;
    independentPicking?: boolean;
    relativePosition?: boolean;
    pitch?: number;
    yaw?: number;
    roll?: number;
    scale?: number | Vec3 | NumberArray3;
    forceGlobalPosition?: boolean;
    forceGlobalRotation?: boolean;
    forceGlobalScale?: boolean;
    localPosition?: Vec3 | NumberArray3;
}

/**
 * Entity instances aggregate multiple forms of visualization into a single high-level object.
 * They can be created manually and added to entity collection.
 *
 * @class
 * @param {IEntityParams} [options] - Entity options:
 * @param {string} [options.name] - Name of the entity.
 * @param {any} [options.properties] - Additional properties of the entity.
 * @param {Vec3 | NumberArray3} [options.cartesian] - Cartesian position.
 * @param {LonLat | NumberArray3 | NumberArray2} [options.lonlat] - Geographic coordinates.
 * @param {number} [options.altitude] - Altitude.
 * @param {boolean} [options.visibility] - Visibility flag.
 * @param {Billboard | IBillboardParams} [options.billboard] - Billboard object or parameters.
 * @param {Label | ILabelParams} [options.label] - Label object or parameters.
 * @param {Polyline | IPolylineParams} [options.polyline] - Polyline object or parameters.
 * @param {Ray | IRayParams} [options.ray] - Ray object or parameters.
 * @param {PointCloud | IPointCloudParams} [options.pointCloud] - Point cloud object or parameters.
 * @param {Geometry | IGeometryParams} [options.geometry] - Geometry object or parameters.
 * @param {GeoObject | IGeoObjectParams} [options.geoObject] - Geo object or parameters.
 * @param {Strip | IStripParams} [options.strip] - Strip object or parameters.
 * @param {boolean} [options.independentPicking] - Independent picking flag.
 * @param {boolean} [options.relativePosition] - Parent relative position flag, otherwise position is absolute.
 * @param {number} [options.pitch] - Rotation around local X-axis in radians.
 * @param {number} [options.yaw] - Rotation around local Y-axis in radians.
 * @param {number} [options.roll] - Rotation around local Z-axis in radians.
 * @param {number | Vec3 | NumberArray3} [options.scale] - Scaling factor.
 * @param {boolean} [options.forceGlobalPosition] - Forces global position for the entity make the same position as its parent.
 * @param {boolean} [options.forceGlobalRotation] - Forces global rotation for the entity make the same rotation as its parent.
 * @param {boolean} [options.forceGlobalScale] - Forces global scale for the entity make the same scale as its parent.
 */
class Entity {

    static __counter__: number = 0;

    protected _name: string;

    /**
     * Uniq identifier.
     * @public
     * @readonly
     */
    protected __id: number;

    /**
     * Entity user defined properties.
     * @public
     * @type {Object}
     */
    public properties: any;


    /**
     * Children entities.
     * @public
     * @type {Array.<Entity>}
     */
    public childEntities: Entity[];

    public forceGlobalPosition: boolean;

    public forceGlobalRotation: boolean;

    public forceGlobalScale: boolean;

    /**
     * Parent entity.
     * @public
     * @type {Entity}
     */
    public parent: Entity | null;

    /**
     * Entity cartesian position.
     * @protected
     * @type {Vec3}
     */
    public _cartesian: Vec3;

    /**
     * Entity cartesian is equal root entity absolute cartesian.
     * @protected
     * @type {Vec3}
     */
    protected _rootCartesian: Vec3;

    protected _localPosition: Vec3;
    protected _absoluteLocalPosition: Vec3;

    /**
     * Geodetic entity coordinates.
     * @public
     * @type {LonLat}
     */
    public _lonLat: LonLat;

    /**
     * World Mercator entity coordinates.
     * @public
     * @type {LonLat}
     */
    public _lonLatMerc: LonLat;

    /**
     * Entity visible terrain altitude.
     * @public
     * @type {number}
     */
    public _altitude: number;

    /**
     * Visibility flag.
     * @protected
     * @type {boolean}
     */
    protected _visibility: boolean;

    /**
     * Entity collection that this entity belongs to.
     * @public
     * @type {EntityCollection}
     */
    public _entityCollection: EntityCollection | null;

    /**
     * Entity collection array store index.
     * @public
     * @type {number}
     */
    public _entityCollectionIndex: number;

    /**
     * Assigned vector layer pointer.
     * @public
     * @type {Vector}
     */
    public _layer: Vector | null;

    /**
     * Assigned vector layer entity array index.
     * @public
     * @type {number}
     */
    public _layerIndex: number;

    /**
     * Picking color.
     * @public
     * @type {Vec3}
     */
    public _pickingColor: Vec3;

    public _independentPicking: boolean;

    protected _featureConstructorArray: Record<string, [any, Function]>;

    /**
     * Billboard entity.
     * @public
     * @type {Billboard | null}
     */
    public billboard: Billboard | null;

    /**
     * Text label entity.
     * @public
     * @type {Label | null}
     */
    public label: Label | null;

    /**
     * Polyline entity.
     * @public
     * @type {Polyline | null}
     */
    public polyline: Polyline | null;

    /**
     * Ray entity.
     * @public
     * @type {Ray | null}
     */
    public ray: Ray | null;

    /**
     * PointCloud entity.
     * @public
     * @type {PointCloud | null}
     */
    public pointCloud: PointCloud | null;

    /**
     * Geometry entity(available for vector layer only).
     * @public
     * @type {Geometry | null}
     */
    public geometry: Geometry | null;

    /**
     * Geo object entity
     * @public
     * @type {Geometry | null}
     */
    public geoObject: GeoObject | null;

    /**
     * Strip entity.
     * @public
     * @type {Strip | null}
     */
    public strip: Strip | null;

    public _nodePtr?: EntityCollectionNode;

    protected _relativePosition: boolean;
    protected _pitchRad: number;
    protected _yawRad: number;
    protected _rollRad: number;
    protected _scale: Vec3;
    protected _absoluteScale: Vec3;
    protected _qFrame: Quat;
    protected _qRot: Quat;
    public _absoluteQRot: Quat;
    protected _useDirectQuaternion: boolean;

    constructor(options: IEntityParams = {}) {

        options.properties = options.properties || {};

        this.__id = Entity.__counter__++;

        this._name = options.name || `entity:${this.__id}`;

        this.properties = options.properties || {};

        //this.properties.name = this.properties.name != undefined ? this.properties.name : "";

        this.childEntities = [];

        this.parent = null;

        this.forceGlobalPosition = options.forceGlobalPosition || false;

        this.forceGlobalRotation = options.forceGlobalRotation || false;

        this.forceGlobalScale = options.forceGlobalScale || false;

        this._cartesian = utils.createVector3(options.cartesian);

        this._rootCartesian = new Vec3();

        this._localPosition = utils.createVector3(options.localPosition);
        this._absoluteLocalPosition = new Vec3();

        this._lonLat = utils.createLonLat(options.lonlat);

        this._lonLatMerc = new LonLat();

        this._altitude = options.altitude || 0.0;

        this._visibility = options.visibility != undefined ? options.visibility : true;

        this._entityCollection = null;

        this._entityCollectionIndex = -1;

        this._layer = null;

        this._layerIndex = -1;

        this._pickingColor = new Vec3(0, 0, 0);

        this._independentPicking = options.independentPicking || false;

        this._relativePosition = options.relativePosition || false;

        this._pitchRad = options.pitch || 0;
        this._yawRad = options.yaw || 0;
        this._rollRad = options.roll || 0;

        this._scale = utils.createVector3(options.scale, new Vec3(1, 1, 1));
        this._absoluteScale = new Vec3();

        this._qFrame = Quat.IDENTITY;
        this._qRot = Quat.IDENTITY;
        this._absoluteQRot = Quat.IDENTITY;
        this._useDirectQuaternion = false;

        this._featureConstructorArray = {
            billboard: [Billboard, this.setBillboard],
            label: [Label, this.setLabel],
            polyline: [Polyline, this.setPolyline],
            pointCloud: [PointCloud, this.setPointCloud],
            geometry: [Geometry, this.setGeometry],
            geoObject: [GeoObject, this.setGeoObject],
            strip: [Strip, this.setStrip],
            ray: [Ray, this.setRay]
        };

        this.billboard = this._createOptionFeature<Billboard, IBillboardParams>("billboard", options.billboard);

        this.label = this._createOptionFeature<Label, ILabelParams>("label", options.label);

        this.polyline = this._createOptionFeature<Polyline, IPolylineParams>("polyline", options.polyline);

        this.ray = this._createOptionFeature<Ray, IRayParams>("ray", options.ray);

        this.pointCloud = this._createOptionFeature<PointCloud, IPolylineParams>("pointCloud", options.pointCloud);

        this.geometry = this._createOptionFeature<Geometry, IGeometryParams>("geometry", options.geometry);

        this.geoObject = this._createOptionFeature<GeoObject, IGeoObjectParams>("geoObject", options.geoObject);

        this.strip = this._createOptionFeature<Strip, IStripParams>("strip", options.strip);

    }

    public get name(): string {
        return this._name;
    }

    public set name(name: string) {
        if (name !== this._name) {
            this._name = name;
            //ec && ec.events.dispatch(ec.events.entityname, this);
        }
    }

    public get isEmpty(): boolean {
        return !(this.strip
            || this.polyline
            || this.ray
            || this.geoObject
            || this.geometry
            || this.billboard
            || this.label
            || this.pointCloud);
    }

    /**
     * Returns root entity object.
     * @public
     * @return {Entity}
     */
    public get rootEntity(): Entity {
        let pn: Entity | null = this;
        while (pn) {
            if (!pn.parent) {
                return pn;
            }
            pn = pn.parent;
        }
        return this;
    }

    /**
     * Sets relative position property
     * @param isRelative
     */
    public set relativePosition(isRelative: boolean) {

        if (isRelative !== this._relativePosition) {

            let cart = this.getAbsoluteCartesian(),
                pitch = this.getAbsolutePitch(),
                yaw = this.getAbsoluteYaw(),
                roll = this.getAbsoluteRoll();

            this._relativePosition = isRelative;

            // probably need to take root this.rootEntity
            if (this.parent) {
                this._rootCartesian.copy(this.parent._rootCartesian);
            }

            if (!isRelative) {
                this.setCartesian3v(cart);
                this.setPitch(pitch);
                this.setYaw(yaw);
                this.setRoll(roll);
            } else if (this.parent) {
                this.setAbsoluteCartesian3v(cart);
                this.setAbsolutePitch(pitch);
                this.setAbsoluteYaw(yaw);
                this.setAbsoluteRoll(roll);
            }
        }
    }

    /**
     * Gets relative position property
     * @public
     * @returns{boolean}
     */
    public get relativePosition(): boolean {
        return this._relativePosition;
    }

    /**
     * Gets current entity collection container.
     * @public
     * @returns {EntityCollection | null}
     */
    public get entityCollection(): EntityCollection | null {
        return this._entityCollection;
    }

    /**
     * Gets entity uniq id
     * @public
     * @returns {number}
     */
    public get id(): number {
        return this.__id;
    }

    /**
     * Checks if the given entity is equal to the current entity.
     * @param {Entity} entity - The entity to compare.
     * @returns {boolean} True if entities are equal, otherwise false.
     */
    public isEqual(entity: Entity): boolean {
        return this.__id === entity.__id;
    }

    /**
     * Gets the layer index of the entity.
     * @returns {number} The layer index.
     */
    public get layerIndex(): number {
        return this._layerIndex;
    }

    /**
     * Gets the instance class name of the entity.
     * @returns {string} The instance name "Entity".
     */
    public get instanceName(): string {
        return "Entity";
    }

    protected _createOptionFeature<T, K>(
        featureName: string,
        options?: T | K
    ): T | null {
        if (options) {
            let c = this._featureConstructorArray[featureName];
            return c[1].call(this, new c[0](options)) as T;
        }
        return null;
    }

    /**
     * Gets the collection index of the entity.
     * @returns {number} The entity collection index.
     */
    public getCollectionIndex(): number {
        return this._entityCollectionIndex;
    }

    /**
     * Adds current entity into the specified entity collection.
     * @public
     * @param {EntityCollection | Vector} collection - Specified entity collection or vector layer.
     * @returns {Entity} - This object.
     */
    public addTo(collection: EntityCollection | Vector): Entity {
        collection.add(this);
        return this;
    }

    /**
     * Removes current entity from its collection or layer.
     * @public
     */
    public remove() {
        this._layer && this._layer.removeEntity(this);
        this._entityCollection && this._entityCollection.removeEntity(this);
    }

    /**
     * Sets the entity visibility.
     * @public
     * @param {boolean} visibility - Entity visibility.
     */
    public setVisibility(visibility: boolean) {
        this._visibility = visibility;

        // billboards
        this.billboard && this.billboard.setVisibility(visibility);

        // geoObject
        this.geoObject && this.geoObject.setVisibility(visibility);

        // labels
        this.label && this.label.setVisibility(visibility);

        // polyline
        this.polyline && this.polyline.setVisibility(visibility);

        // ray
        this.ray && this.ray.setVisibility(visibility);

        // geometry
        this.geometry && this.geometry.setVisibility(visibility);

        for (let i = 0; i < this.childEntities.length; i++) {
            this.childEntities[i].setVisibility(visibility);
        }
    }

    /**
     * Returns entity visibility.
     * @public
     * @returns {boolean} -
     */
    public getVisibility() {
        return this._visibility;
    }

    /**
     * Sets entity cartesian position.
     * @public
     * @param {Vec3} cartesian - Cartesian position in 3d space.
     */
    public setCartesian3v(cartesian: Vec3) {
        this.setCartesian(cartesian.x, cartesian.y, cartesian.z);
    }

    /**
     * Gets scale factor
     * @public
     * @returns {Vec3}
     */
    public getScale(): Vec3 {
        return this._scale;
    }

    /**
     * Sets XYZ axis scale for the inner object such as GeoObject
     * @public
     * @param {Vec3} scale - Scale factor
     */
    public setScale3v(scale: Vec3) {
        this._scale.copy(scale);
        this._updateAbsolutePosition();
        for (let i = 0; i < this.childEntities.length; i++) {
            let chi = this.childEntities[i];
            if (chi.forceGlobalScale) {
                chi.setScale3v(this._scale);
            } else {
                chi.setScale3v(this.childEntities[i].getScale());
            }
        }
    }

    /**
     * Sets scale for the inner object such as GeoObject
     * @public
     * @param {number} val - Scale factor
     */
    public setScale(val: number) {
        this.setScale3v(new Vec3(val, val, val));
    }

    /**
     * Gets the absolute rotation direction of the entity.
     * @public
     * @returns {Quat} The absolute rotation quaternion.
     */
    public getAbsoluteRotation(): Quat {
        return this._absoluteQRot.clone();
    }

    /**
     * Gets the local rotation of the entity. For the root entity it is equal to the absolute rotation.
     * @public
     * @returns {Quat} The rotation quaternion.
     */
    public getRotation(): Quat {
        return this._qRot;
    }

    /**
     * Rotates the entity to look at a given point in world coordinates.
     * @public
     * @param {Vec3} cart - The target position to look at.
     */
    public setLook3v(cart: Vec3) {
        let lq = new Quat();
        let p0 = this.getAbsoluteCartesian();
        let rot;
        if (this._entityCollection) {
            let up = (this._entityCollection.renderNode as Planet).ellipsoid.getSurfaceNormal3v(p0);
            rot = lq.setLookRotation(cart.sub(p0), up).conjugate();

        } else {
            rot = lq.setLookRotation(cart.sub(p0), Vec3.UP).conjugate();
        }
        this.setAbsoluteRotation(rot);
    }

    /**
     * Rotates the entity to look at a given geographic coordinate.
     * @public
     * @param {LonLat} lonLat - The longitude and latitude to look at.
     */
    public setLookLonLat(lonLat: LonLat) {
        if (this._entityCollection) {
            let cart = (this._entityCollection.renderNode as Planet).ellipsoid.lonLatToCartesian(lonLat);
            this.setLook3v(cart);
        }
    }

    /**
     * Sets the absolute rotation of the entity.
     * @public
     * @param {Quat} rot - The new absolute rotation quaternion.
     */
    public setAbsoluteRotation(rot: Quat) {
        this._absoluteQRot.copy(rot);
        this._updatePitchYawRoll();
    }

    /**
     * Sets the local rotation of the entity.
     * @param {Quat} rot - The new rotation quaternion.
     */
    public setRotation(rot: Quat) {
        this._useDirectQuaternion = false;

        this._pitchRad = rot.getPitch();
        this._yawRad = rot.getYaw();
        this._rollRad = rot.getRoll();

        this._updateAbsolutePosition();
    }

    /**
     * Sets rotation directly from glTF quaternion with common coordinate system conversion.
     * This method avoids current pitch/yaw/roll airplane like conversion.
     * @public
     * @param {Quat} rot - Quaternion from glTF
     */
    public setDirectQuaternionRotation(rot: Quat) {

        this._qRot.copy(rot);
        this._useDirectQuaternion = true;

        this._pitchRad = this._qRot.getPitch();
        this._yawRad = this._qRot.getYaw();
        this._rollRad = this._qRot.getRoll();

        this._updateAbsolutePosition();

        // ?
        //this._useDirectQuaternion = false;
    }

    /**
     * Sets the pitch rotation of the entity.
     * @param {number} val - The new pitch angle in radians.
     */
    public setPitch(val: number) {
        this._useDirectQuaternion = false;
        this._pitchRad = val;
        this._updateAbsolutePosition();
    }

    /**
     * Sets the yaw rotation of the entity.
     * @param {number} val - The new yaw angle in radians.
     */
    public setYaw(val: number) {
        this._useDirectQuaternion = false;
        this._yawRad = val;
        this._updateAbsolutePosition();
    }

    /**
     * Sets the roll rotation of the entity.
     * @public
     * @param {number} val - The new roll angle in radians.
     */
    public setRoll(val: number) {
        this._useDirectQuaternion = false;
        this._rollRad = val;
        this._updateAbsolutePosition();
    }

    /**
     * Gets the pitch angle of the entity.
     * @public
     * @returns {number} The pitch angle in radians.
     */
    public getPitch(): number {
        return this._pitchRad;
    }

    /**
     * Gets the yaw angle of the entity.
     * @public
     * @returns {number} The yaw angle in radians.
     */
    public getYaw(): number {
        return this._yawRad;
    }

    /**
     * Gets the roll angle of the entity.
     * @public
     * @returns {number} The roll angle in radians.
     */
    public getRoll(): number {
        return this._rollRad;
    }

    /**
     * Sets the absolute pitch of the entity.
     * @public
     * @param {number} val - The absolute pitch angle in radians.
     */
    public setAbsolutePitch(val: number) {
        if (this._relativePosition) {
            this._absoluteQRot.setPitchYawRoll(val, this.getAbsoluteYaw(), this.getAbsoluteRoll(), this._qFrame);
            this._updatePitchYawRoll();
        } else {
            this.setPitch(val);
        }
    }

    /**
     * Sets the absolute yaw of the entity.
     * @public
     * @param {number} val - The absolute yaw angle in radians.
     */
    public setAbsoluteYaw(val: number) {
        if (this._relativePosition) {
            this._absoluteQRot.setPitchYawRoll(this.getAbsolutePitch(), val, this.getAbsoluteRoll(), this._qFrame);
            this._updatePitchYawRoll();
        } else {
            this.setYaw(val);
        }
    }

    /**
     * Sets the absolute roll of the entity.
     * @public
     * @param {number} val - The absolute roll angle in radians.
     */
    public setAbsoluteRoll(val: number) {
        if (this._relativePosition) {
            this._absoluteQRot.setPitchYawRoll(this.getAbsolutePitch(), this.getAbsoluteYaw(), val, this._qFrame);
            this._updatePitchYawRoll();
        } else {
            this.setRoll(val);
        }
    }

    /**
     * Gets the absolute pitch angle of the entity.
     * @public
     * @returns {number} The absolute pitch angle in radians.
     */
    public getAbsolutePitch(): number {
        if (this.parent && this._relativePosition) {
            return this._qFrame.conjugate().inverse().mul(this._absoluteQRot).getPitch();
        }

        return this._pitchRad;
    }

    /**
     * Gets the absolute yaw angle of the entity.
     * @public
     * @returns {number} The absolute yaw angle in radians.
     */
    public getAbsoluteYaw(): number {
        if (this.parent && this._relativePosition) {
            return this._qFrame.conjugate().inverse().mul(this._absoluteQRot).getYaw();
        }
        return this._yawRad;
    }

    /**
     * Gets the absolute roll angle of the entity.
     * @public
     * @returns {number} The absolute roll angle in radians.
     */
    public getAbsoluteRoll(): number {
        if (this.parent && this._relativePosition) {
            return this._qFrame.conjugate().inverse().mul(this._absoluteQRot).getRoll();
        }
        return this._rollRad;
    }

    protected _getScaleByDistance(): number {
        let scd = 1;
        if (this._entityCollection) {
            let scaleByDistance = this._entityCollection.scaleByDistance;
            let lookLength = 1;
            if (this._entityCollection.renderNode && this._entityCollection.renderNode.renderer) {
                lookLength = this._entityCollection.renderNode.renderer.activeCamera.eye.distance(this._rootCartesian);
            }
            //the same in the shader
            scd = scaleByDistance[2] * clamp(lookLength, scaleByDistance[0], scaleByDistance[1]) / scaleByDistance[0];
        }
        return scd;
    }

    /**
     * Sets the absolute cartesian position of the entity.
     * @public
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     * @param {number} z - Z coordinate.
     */
    public setAbsoluteCartesian(x: number, y: number, z: number) {
        this.setAbsoluteCartesian3v(new Vec3(x, y, z));
    }

    /**
     * Sets the absolute cartesian position of the entity using a Vec3.
     * @public
     * @param {Vec3} absolutCartesian - The absolute cartesian position.
     */
    public setAbsoluteCartesian3v(absolutCartesian: Vec3) {
        let pos = absolutCartesian;

        if (this.parent && this._relativePosition) {
            let scd = this._getScaleByDistance();
            pos = absolutCartesian.sub(this.parent.getAbsoluteCartesian()).scale(1 / scd).divA(this.parent._absoluteScale);
            pos = this.parent._absoluteQRot.conjugate().mulVec3(pos);
        }

        this.setCartesian3v(pos);
    }

    /**
     * Returns absolute cartesian position.
     * @public
     * @returns {Vec3} -
     */
    public getAbsoluteCartesian(): Vec3 {
        if (this.parent && this._relativePosition) {
            let scd = this._getScaleByDistance();
            return this._rootCartesian.add(this._absoluteLocalPosition.scaleTo(scd));
        }
        return this._cartesian.clone();
    }

    /**
     * Sets entity cartesian position.
     * @public
     * @param {number} x - 3d space X - position.
     * @param {number} y - 3d space Y - position.
     * @param {number} z - 3d space Z - position.
     */
    public setCartesian(x: number, y: number, z: number) {

        this._cartesian.set(x, y, z);

        this._updateAbsolutePosition();

        for (let i = 0; i < this.childEntities.length; i++) {
            let chi = this.childEntities[i];
            if (chi._relativePosition) {
                chi.setCartesian3v(chi.getCartesian());
            } else if (chi.forceGlobalPosition) {
                chi.setCartesian(x, y, z);
            }
        }

        this._updateLonLat();

        //ec && ec.events.dispatch(ec.events.entitymove, this);
    }

    protected _updatePitchYawRoll() {
        if (this.parent) {
            this._qRot = this.parent._absoluteQRot.conjugate().mul(this._absoluteQRot);

            this._pitchRad = this._qRot.getPitch();
            this._yawRad = this._qRot.getYaw();
            this._rollRad = this._qRot.getRoll();

            if (this.geoObject) {
                this.geoObject.setRotation(this._absoluteQRot);
            }

            for (let i = 0; i < this.childEntities.length; i++) {
                this.childEntities[i]._updateAbsolutePosition();
            }
        }
    }

    public _updateAbsolutePosition() {

        let parent = this.parent;

        if (parent && this._relativePosition) {
            this._scale.mulRes(parent._absoluteScale, this._absoluteScale);

            this._qFrame.copy(parent._qFrame);
            this._rootCartesian.copy(parent._rootCartesian);

            if (!this._useDirectQuaternion) {
                //this._qRot.setPitchYawRoll(this._pitchRad, this._yawRad, this._rollRad);

                if (parent && this.forceGlobalRotation) {
                    this._qRot.setPitchYawRoll(parent._pitchRad, parent._yawRad, parent._rollRad);
                } else {
                    this._qRot.setPitchYawRoll(this._pitchRad, this._yawRad, this._rollRad);
                }
            }
            parent._absoluteQRot.mulRes(this._qRot, this._absoluteQRot);

            let rotCart = parent._absoluteQRot.mulVec3(this._cartesian.add(this._localPosition)).mulA(parent._absoluteScale);
            parent._absoluteLocalPosition.addRes(rotCart, this._absoluteLocalPosition);
        } else {
            this._qFrame = Quat.IDENTITY;
            if (this._entityCollection && this._entityCollection.renderNode) {
                this._qFrame = this._entityCollection.renderNode.getFrameRotation(this._cartesian);
            }

            if (!this._useDirectQuaternion) {
                if (parent && this.forceGlobalRotation) {
                    this._qRot.setPitchYawRoll(parent._pitchRad, parent._yawRad, parent._rollRad, this._qFrame);
                } else {
                    this._qRot.setPitchYawRoll(this._pitchRad, this._yawRad, this._rollRad, this._qFrame);
                }
            } else if (!this._qFrame.isEqual(Quat.IDENTITY)) {
                this._qRot = this._qRot.mul(this._qFrame);
            }

            this._absoluteScale.copy(this._scale);
            this._absoluteQRot.copy(this._qRot);
            this._rootCartesian.copy(this._cartesian);
            this._absoluteLocalPosition.copy(this._localPosition);
        }

        if (this.geoObject) {
            this.geoObject.setScale3v(this._absoluteScale);
            this.geoObject.setRotation(this._absoluteQRot);
            this.geoObject.setPosition3v(this._rootCartesian);
            this.geoObject.setLocalPosition3v(this._absoluteLocalPosition);
        }

        this.billboard && this.billboard.setPosition3v(this._rootCartesian);
        this.label && this.label.setPosition3v(this._rootCartesian);

        for (let i = 0, len = this.childEntities.length; i < len; i++) {
            this.childEntities[i]._updateAbsolutePosition();
        }

        this._updateLonLat();
    }

    /**
     * Sets entity cartesian position without event dispatching.
     * @public
     * @param {Vec3} cartesian - Cartesian position in 3d space.
     * @param {boolean} skipLonLat - skip geodetic calculation.
     */
    public _setCartesian3vSilent(cartesian: Vec3, skipLonLat: boolean = false) {

        this._cartesian.copy(cartesian);

        this._updateAbsolutePosition();

        for (let i = 0; i < this.childEntities.length; i++) {
            this.childEntities[i].setCartesian(this._cartesian.x, this._cartesian.y, this._cartesian.z);
        }

        if (!skipLonLat) {
            this._updateLonLat();
        }
    }

    protected _updateLonLat() {
        let ec = this._entityCollection;

        if (ec && ec.renderNode && (ec.renderNode as Planet).ellipsoid) {
            //let cart = this._rootCartesian.add(this._absoluteLocalPosition);
            this._lonLat = (ec.renderNode as Planet).ellipsoid.cartesianToLonLat(this.getAbsoluteCartesian());

            if (Math.abs(this._lonLat.lat) < mercator.MAX_LAT) {
                this._lonLatMerc = this._lonLat.forwardMercator();
            } else {
                this._lonLatMerc.lon = this._lonLatMerc.lat = 0;
            }
        }
    }

    /**
     * Gets entity geodetic coordinates.
     * @public
     * @returns {LonLat} -
     */
    public getLonLat(): LonLat {
        return this._lonLat.clone();
    }

    /**
     * Sets geodetic coordinates of the entity point object.
     * @public
     * @param {LonLat} lonlat - coordinates.
     */
    public setLonLat(lonlat: LonLat) {
        let l = this._lonLat;

        l.lon = lonlat.lon;
        l.lat = lonlat.lat;
        l.height = lonlat.height;

        let ec = this._entityCollection;
        if (ec && ec.renderNode && (ec.renderNode as Planet).ellipsoid) {
            if (Math.abs(l.lat) < mercator.MAX_LAT) {
                this._lonLatMerc = l.forwardMercator();
            } else {
                //this._lonLatMerc = null;
            }

            let temp = new Vec3();
            (ec.renderNode as Planet).ellipsoid.lonLatToCartesianRes(l, temp);

            this.setAbsoluteCartesian3v(temp);
        }
    }

    /**
     * Sets geodetic coordinates of the entity point object.
     * @public
     * @param {number} lon - Longitude.
     * @param {number} lat - Latitude
     * @param {number} [height] - Height
     */
    public setLonLat2(lon: number, lat: number, height?: number) {
        let l = this._lonLat;

        l.lon = lon;
        l.lat = lat;
        l.height = height != undefined ? height : l.height;

        let ec = this._entityCollection;
        if (ec && ec.renderNode && (ec.renderNode as Planet).ellipsoid) {
            if (Math.abs(l.lat) < mercator.MAX_LAT) {
                this._lonLatMerc = l.forwardMercator();
            } else {
                this._lonLatMerc.lon = this._lonLatMerc.lat = this._lonLatMerc.height = 0;
            }

            let temp = new Vec3();
            (ec.renderNode as Planet).ellipsoid.lonLatToCartesianRes(l, temp);

            this.setAbsoluteCartesian3v(temp);
        }
    }

    /**
     * Sets entity altitude over the planet.
     * @public
     * @param {number} altitude - Altitude.
     */
    public setAltitude(altitude: number) {
        this._altitude = altitude;
    }

    /**
     * Sets entity altitude over the planet.
     * @public
     * @return {number} Altitude.
     */
    public getAltitude(): number {
        return this._altitude;
    }

    /**
     * Returns cartesian position.
     * @public
     * @returns {Vec3} -
     */
    public getCartesian(): Vec3 {
        return this._cartesian.clone();
    }

    /**
     * Sets entity billboard.
     * @public
     * @param {Billboard} billboard - Billboard object.
     * @returns {Billboard} -
     */
    public setBillboard(billboard: Billboard): Billboard {
        if (this.billboard) {
            this.billboard.remove();
        }
        this.billboard = billboard;
        this.billboard._entity = this;
        this.billboard.setPosition3v(this._cartesian);
        this.billboard.setVisibility(this._visibility);
        this._entityCollection && this._entityCollection.billboardHandler.add(billboard);
        return billboard;
    }

    /**
     * Sets entity label.
     * @public
     * @param {Label} label - Text label.
     * @returns {Label} -
     */
    public setLabel(label: Label): Label {
        if (this.label) {
            this.label.remove();
        }
        this.label = label;
        this.label._entity = this;
        this.label.setPosition3v(this._cartesian);
        this.label.setVisibility(this._visibility);
        this._entityCollection && this._entityCollection.labelHandler.add(label);
        return label;
    }

    /**
     * Sets entity ray.
     * @public
     * @param {Ray} ray - Ray object.
     * @returns {Ray} -
     */
    public setRay(ray: Ray): Ray {
        if (this.ray) {
            this.ray.remove();
        }
        this.ray = ray;
        this.ray._entity = this;
        this.ray.setVisibility(this._visibility);
        this._entityCollection && this._entityCollection.rayHandler.add(ray);
        return ray;
    }

    /**
     * Sets entity polyline.
     * @public
     * @param {Polyline} polyline - Polyline object.
     * @returns {Polyline} -
     */
    public setPolyline(polyline: Polyline): Polyline {
        if (this.polyline) {
            this.polyline.remove();
        }
        this.polyline = polyline;
        this.polyline._entity = this;
        this.polyline.setVisibility(this._visibility);
        this._entityCollection && this._entityCollection.polylineHandler.add(polyline);
        return polyline;
    }

    /**
     * Sets entity pointCloud.
     * @public
     * @param {PointCloud} pointCloud - PointCloud object.
     * @returns {PointCloud} -
     */
    public setPointCloud(pointCloud: PointCloud): PointCloud {
        if (this.pointCloud) {
            this.pointCloud.remove();
        }
        this.pointCloud = pointCloud;
        this.pointCloud._entity = this;
        this.pointCloud.setVisibility(this._visibility);
        this._entityCollection && this._entityCollection.pointCloudHandler.add(pointCloud);
        return pointCloud;
    }

    /**
     * Sets entity geometry.
     * @public
     * @param {Geometry} geometry - Geometry object.
     * @returns {Geometry} -
     */
    public setGeometry(geometry: Geometry): Geometry {
        if (this.geometry) {
            this.geometry.remove();
        }
        this.geometry = geometry;
        this.geometry._entity = this;
        this.geometry.setVisibility(this._visibility);
        let layer = this._layer;
        if (this._layer) {
            this._layer.removeEntity(this);
        }
        layer && layer.add(this);
        return geometry;
    }

    /**
     * Sets entity geoObject.
     * @public
     * @param {GeoObject} geoObject - GeoObject.
     * @returns {GeoObject} -
     */
    public setGeoObject(geoObject: GeoObject): GeoObject {
        if (this.geoObject) {
            this.geoObject.remove();
        }
        this.geoObject = geoObject;
        this.geoObject._entity = this;
        this.geoObject.setPosition3v(this._cartesian);
        this.geoObject.setVisibility(this._visibility);
        this._entityCollection && this._entityCollection.geoObjectHandler.add(geoObject);
        return geoObject;
    }

    /**
     * Sets entity strip.
     * @public
     * @param {Strip} strip - Strip object.
     * @returns {Strip} -
     */
    public setStrip(strip: Strip): Strip {
        if (this.strip) {
            this.strip.remove();
        }
        this.strip = strip;
        this.strip._entity = this;
        this.strip.setVisibility(this._visibility);
        this._entityCollection && this._entityCollection.stripHandler.add(strip);
        return strip;
    }

    /**
     * Gets layer container
     * @public
     * @returns {Vector | null}
     */
    public get layer(): Vector | null {
        return this._layer;
    }

    public get rendererEvents(): VectorEventsType | EntityCollectionEvents | null {
        if (this._layer) {
            return this._layer.events;
        } else if (this._entityCollection) {
            return this._entityCollection.events;
        }
        return null;
    }

    /**
     * Append child entity.
     * @public
     * @param {Entity[]} entities - Child entities.
     * @param {boolean} [forceRelativePosition] - Force relative position property.
     */
    public appendChildren(entities: Entity[], forceRelativePosition?: boolean) {
        for (let i = 0; i < entities.length; i++) {
            if (forceRelativePosition !== undefined) {
                entities[i].relativePosition = forceRelativePosition;
            }
            this.appendChild(entities[i]);
        }
    }

    /**
     * Append child entity.
     * @public
     * @param {Entity} entity - Child entity.
     */
    public appendChild(entity: Entity) {
        entity._entityCollection = this._entityCollection;
        if (!entity._independentPicking) {
            entity._pickingColor = this._pickingColor;
        }
        entity.parent = this;
        this.childEntities.push(entity);
        this._entityCollection && this._entityCollection.appendChildEntity(entity);
    }

    /**
     * Appends entity items(billboard, label etc.) picking color.
     * @public
     */
    public setPickingColor() {
        let c = this._pickingColor;

        this.billboard && this.billboard.setPickingColor3v(c);

        this.label && this.label.setPickingColor3v(c);

        this.polyline && this.polyline.setPickingColor3v(c);

        this.ray && this.ray.setPickingColor3v(c);

        this.strip && this.strip.setPickingColor3v(c);

        this.geoObject && this.geoObject.setPickingColor3v(c);

        for (let i = 0; i < this.childEntities.length; i++) {
            this.childEntities[i].setPickingColor();
        }
    }

    /**
     * Return geodetic extent.
     * @public
     * @returns {Extent} -
     */
    public getExtent(): Extent {

        let res;
        let c = this._lonLat;

        if (this.billboard || this.label) {
            res = new Extent(new LonLat(c.lon, c.lat), new LonLat(c.lon, c.lat));
        } else {
            res = new Extent(new LonLat(180.0, 90.0), new LonLat(-180.0, -90.0));
        }

        let sw = res.southWest,
            ne = res.northEast;

        if (this.polyline) {
            let e = this.polyline.getExtent();
            if (e.southWest.lon < sw.lon) sw.lon = e.southWest.lon;
            if (e.southWest.lat < sw.lat) sw.lat = e.southWest.lat;
            if (e.northEast.lon > ne.lon) ne.lon = e.northEast.lon;
            if (e.northEast.lat > ne.lat) ne.lat = e.northEast.lat;
        }

        if (this.geometry) {
            let e = this.geometry.getExtent();
            if (e.southWest.lon < sw.lon) sw.lon = e.southWest.lon;
            if (e.southWest.lat < sw.lat) sw.lat = e.southWest.lat;
            if (e.northEast.lon > ne.lon) ne.lon = e.northEast.lon;
            if (e.northEast.lat > ne.lat) ne.lat = e.northEast.lat;
        }

        for (let i = 0; i < this.childEntities.length; i++) {
            let e = this.childEntities[i].getExtent();
            if (e.southWest.lon < sw.lon) sw.lon = e.southWest.lon;
            if (e.southWest.lat < sw.lat) sw.lat = e.southWest.lat;
            if (e.northEast.lon > ne.lon) ne.lon = e.northEast.lon;
            if (e.northEast.lat > ne.lat) ne.lat = e.northEast.lat;
        }

        return res;
    }
}

export {Entity};
