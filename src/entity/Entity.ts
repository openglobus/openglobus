import * as mercator from "../mercator";
import * as utils from "../utils/shared";
import {Billboard, IBillboardParams} from "./Billboard";
import {EntityCollection, EntityCollectionEvents} from "./EntityCollection";
import {Extent} from "../Extent";
import {Geometry, IGeometryParams} from "./Geometry";
import {GeoObject, IGeoObjectParams} from "./GeoObject";
import {LonLat} from "../LonLat";
import {Label, ILabelParams} from "./Label";
import {NumberArray3, Vec3} from "../math/Vec3";
import {NumberArray2} from "../math/Vec2";
import {Planet} from "../scene/Planet";
import {IPointCloudParams, PointCloud} from "./PointCloud";
import {IPolylineParams, Polyline} from "./Polyline";
import {IRayParams, Ray} from "./Ray";
import {Strip, IStripParams} from "./Strip";
import {Vector, VectorEventsType} from "../layer/Vector";
import {EntityCollectionNode} from "../quadTree/EntityCollectionNode";

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
}

/**
 * Entity instances aggregate multiple forms of visualization into a single high-level object.
 * They can be created manually and added to entity collection.
 *
 * @class
 * @param {Object} [options] - Entity options:
 * @param {string} [options.name] - A human-readable name to display to users. It does not have to be unique.
 * @param {Vec3|Array.<number>} [options.cartesian] - Spatial entities like billboard, label etc. cartesian position.
 * @param {LonLat} [options.lonlat] - Geodetic coordinates for an entities like billboard, label etc.
 * @param {boolean} [options.aground] - True for entities that have to be placed on the relief.
 * @param {boolean} [options.visibility] - Entity visibility.
 * @param {*} [options.billboard] - Billboard options(see {@link Billboard}).
 * @param {*} [options.label] - Label options(see {@link Label}).
 * @param {*} [options.polyline] - Polyline options(see {@link Polyline}).
 * @param {*} [options.ray] - Ray options(see {@link Ray}).
 * @param {*} [options.pointCloud] - Point cloud options(see {@link PointCloud}).
 * @param {*} [options.geometry] - Geometry options (see {@link Geometry}), available for vector layer only.
 * @param {*} [options.properties] - Entity custom properties.
 */
class Entity {

    static __counter__: number = 0;

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
    public childrenNodes: Entity[];

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

    constructor(options: IEntityParams = {}) {

        options.properties = options.properties || {};

        this.__id = Entity.__counter__++;

        this.properties = options.properties || {};

        this.properties.name = this.properties.name != undefined ? this.properties.name : "";

        this.childrenNodes = [];

        this.parent = null;

        this._cartesian = utils.createVector3(options.cartesian);

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

    public get entityCollection(): EntityCollection | null {
        return this._entityCollection;
    }

    public get id(): number {
        return this.__id;
    }

    public isEqual(entity: Entity): boolean {
        return this.__id === entity.__id;
    }

    public get layerIndex(): number {
        return this._layerIndex;
    }

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

    public getCollectionIndex(): number {
        return this._entityCollectionIndex;
    }

    /**
     * Adds current entity into the specified entity collection.
     * @public
     * @param {EntityCollection | Vector} collection - Specified entity collection or vector layer.
     * @param {Boolean} [rightNow=false] - Entity insertion option for vector layer.
     * @returns {Entity} - This object.
     */
    public addTo(collection: EntityCollection | Vector, rightNow: boolean = false) {
        collection.add(this, rightNow);
        return this;
    }

    /**
     * Removes current entity from collection and layer.
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

        for (let i = 0; i < this.childrenNodes.length; i++) {
            this.childrenNodes[i].setVisibility(visibility);
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
     * Sets entity cartesian position.
     * @public
     * @param {number} x - 3d space X - position.
     * @param {number} y - 3d space Y - position.
     * @param {number} z - 3d space Z - position.
     */
    public setCartesian(x?: number, y?: number, z?: number) {
        let p = this._cartesian;

        p.x = x || 0.0;
        p.y = y || 0.0;
        p.z = z || 0.0;

        // billboards
        this.billboard && this.billboard.setPosition3v(p);

        // geoObject
        this.geoObject && this.geoObject.setPosition3v(p);

        // labels
        this.label && this.label.setPosition3v(p);

        for (let i = 0; i < this.childrenNodes.length; i++) {
            this.childrenNodes[i].setCartesian(x, y, z);
        }

        let ec = this._entityCollection;

        if (ec && ec.renderNode && (ec.renderNode as Planet).ellipsoid) {
            this._lonLat = (ec.renderNode as Planet).ellipsoid.cartesianToLonLat(p);

            if (Math.abs(this._lonLat.lat) < mercator.MAX_LAT) {
                this._lonLatMerc = this._lonLat.forwardMercator();
            } else {
                this._lonLatMerc.lon = this._lonLatMerc.lat = this._lonLatMerc.height = 0;
            }
        }

        //ec && ec.events.dispatch(ec.events.entitymove, this);
    }

    /**
     * Sets entity cartesian position without event dispatching.
     * @public
     * @param {Vec3} cartesian - Cartesian position in 3d space.
     * @param {boolean} skipLonLat - skip geodetic calculation.
     */
    public _setCartesian3vSilent(cartesian: Vec3, skipLonLat: boolean = false) {
        let p = this._cartesian;

        p.x = cartesian.x || 0.0;
        p.y = cartesian.y || 0.0;
        p.z = cartesian.z || 0.0;

        // billboards
        this.billboard && this.billboard.setPosition3v(p);

        // geoObject
        this.geoObject && this.geoObject.setPosition3v(p);

        // labels
        this.label && this.label.setPosition3v(p);

        for (let i = 0; i < this.childrenNodes.length; i++) {
            this.childrenNodes[i].setCartesian(p.x, p.y, p.z);
        }

        let ec = this._entityCollection;

        if (!skipLonLat && ec && ec.renderNode && (ec.renderNode as Planet).ellipsoid) {
            this._lonLat = (ec.renderNode as Planet).ellipsoid.cartesianToLonLat(p);

            if (Math.abs(this._lonLat.lat) < mercator.MAX_LAT) {
                this._lonLatMerc = this._lonLat.forwardMercator();
            } else {
                //this._lonLatMerc = null;
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
     * @param {LonLat} lonlat - WGS84 coordinates.
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

            (ec.renderNode as Planet).ellipsoid.lonLatToCartesianRes(l, this._cartesian);
            this.setCartesian3v(this._cartesian);
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

            (ec.renderNode as Planet).ellipsoid.lonLatToCartesianRes(l, this._cartesian);
            this.setCartesian3v(this._cartesian);
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
     * @param {Entity} entity - Child entity.
     */
    public appendChild(entity: Entity) {
        entity._entityCollection = this._entityCollection;
        if (!entity._independentPicking) {
            entity._pickingColor = this._pickingColor;
        }
        entity.parent = this;
        this.childrenNodes.push(entity);
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

        for (let i = 0; i < this.childrenNodes.length; i++) {
            this.childrenNodes[i].setPickingColor();
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

        for (let i = 0; i < this.childrenNodes.length; i++) {
            let e = this.childrenNodes[i].getExtent();
            if (e.southWest.lon < sw.lon) sw.lon = e.southWest.lon;
            if (e.southWest.lat < sw.lat) sw.lat = e.southWest.lat;
            if (e.northEast.lon > ne.lon) ne.lon = e.northEast.lon;
            if (e.northEast.lat > ne.lat) ne.lat = e.northEast.lat;
        }

        return res;
    }
}

export {Entity};
