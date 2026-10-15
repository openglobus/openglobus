import { Control, type IControlParams } from "./Control";
import { Vector } from "../layer/Vector";
import { GeoTIFFLayer } from "../layer/GeoTIFFLayer";
import { Entity } from "../entity/Entity";
import { Object3d } from "../Object3d";
import { Gltf } from "../utils/gltf/gltfParser";
import { Vec2 } from "../math/Vec2";
import { EntityEditor } from "./entityEditor/EntityEditor";
import type { LonLat } from "../LonLat";

export interface IDragAndDropParams extends IControlParams {
    entityEditor?: EntityEditor;
}

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
const TIFF_EXT = ["tif", "tiff"];
const MAX_BILLBOARD_SIZE = 256;

function getExt(file: File): string {
    const i = file.name.lastIndexOf(".");
    return i !== -1 ? file.name.slice(i + 1).toLowerCase() : "";
}

function getBaseName(file: File): string {
    const i = file.name.lastIndexOf(".");
    return i !== -1 ? file.name.slice(0, i) : file.name;
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Unable to load image '${src}'`));
        img.src = src;
    });
}

/**
 * Adds dropped files on the globe: glb/obj models and images are placed in the drop point,
 * GeoTIFF rasters are placed by their georeference.
 */
export class DragAndDrop extends Control {
    public geoObjectsLayer: Vector;
    public markersLayer: Vector;
    public tiffLayers: GeoTIFFLayer[];

    protected _entityEditor: EntityEditor | null;

    constructor(options: IDragAndDropParams = {}) {
        super({
            name: "DragAndDrop",
            autoActivate: true,
            ...options
        });

        this.geoObjectsLayer = new Vector("__geoObjects__");

        this.markersLayer = new Vector("__markers__");

        this.tiffLayers = [];

        this._entityEditor = options.entityEditor || null;
    }

    public override oninit() {
        this.planet!.addLayers([this.geoObjectsLayer, this.markersLayer]);
    }

    public override onremove() {
        this.geoObjectsLayer.remove();
        this.markersLayer.remove();
        for (let i = 0; i < this.tiffLayers.length; i++) {
            this.tiffLayers[i].remove();
        }
        this.tiffLayers = [];
    }

    public override onactivate() {
        const el = this.renderer!.getInnerContainer();
        el.addEventListener("dragover", this._onDragOver);
        el.addEventListener("drop", this._onDrop);
    }

    public override ondeactivate() {
        const el = this.renderer!.getInnerContainer();
        el.removeEventListener("dragover", this._onDragOver);
        el.removeEventListener("drop", this._onDrop);
    }

    protected _onDragOver = (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = "copy";
        }
    };

    protected _onDrop = (e: DragEvent) => {
        e.preventDefault();
        if (!e.dataTransfer || !e.dataTransfer.files.length) return;
        const lonLat = this._getLonLatFromEvent(e);
        this.addFiles(Array.from(e.dataTransfer.files), lonLat);
    };

    protected _getLonLatFromEvent(e: DragEvent): LonLat | undefined {
        const h = this.renderer!.handler;
        const rect = h.canvas!.getBoundingClientRect();
        const px = new Vec2((e.clientX - rect.left) * h.pixelRatio, (e.clientY - rect.top) * h.pixelRatio);
        return this.planet!.getLonLatFromPixelTerrain(px);
    }

    /**
     * Adds files on the globe. Mtl file goes along with the obj file in the same list.
     */
    public addFiles(files: File[], lonLat?: LonLat) {
        const mtlFile = files.find((f) => getExt(f) === "mtl") || null;
        for (let i = 0; i < files.length; i++) {
            this.addFile(files[i], lonLat, mtlFile).catch((err) => {
                console.warn(`DragAndDrop: unable to add '${files[i].name}'.`, err);
            });
        }
    }

    public async addFile(file: File, lonLat?: LonLat, mtlFile?: File | null): Promise<void> {
        const ext = getExt(file);
        if (ext === "glb" || ext === "gltf") {
            lonLat && (await this._addGltf(file, lonLat));
        } else if (ext === "obj") {
            lonLat && (await this._addObj(file, lonLat, mtlFile));
        } else if (IMAGE_EXT.includes(ext)) {
            lonLat && (await this._addBillboard(file, lonLat));
        } else if (TIFF_EXT.includes(ext)) {
            await this._addTiff(file);
        }
    }

    protected async _addGltf(file: File, lonLat: LonLat) {
        const url = URL.createObjectURL(file);
        try {
            const gltf = getExt(file) === "glb" ? await Gltf.loadGlb(url) : await Gltf.loadGltf(url);
            const entity = new Entity({
                name: getBaseName(file),
                lonlat: lonLat
            });
            entity.appendChildren(gltf.toEntities(), true);
            this.geoObjectsLayer.add(entity);
            this._selectEntity(entity);
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    protected async _addObj(file: File, lonLat: LonLat, mtlFile?: File | null) {
        const name = getBaseName(file);
        const objects = await Object3d.readFileObj(file, mtlFile);
        const entity = new Entity({
            name,
            lonlat: lonLat
        });
        for (let i = 0; i < objects.length; i++) {
            entity.appendChild(
                new Entity({
                    relativePosition: true,
                    geoObject: {
                        tag: `${name}:${i.toString()}`,
                        object3d: objects[i]
                    }
                })
            );
        }
        this.geoObjectsLayer.add(entity);
        this._selectEntity(entity);
    }

    protected _selectEntity(entity: Entity) {
        if (!this._entityEditor) {
            const control = this.renderer?.controls.EntityEditor;
            if (control instanceof EntityEditor) {
                this._entityEditor = control;
            }
        }
        this._entityEditor?.selectEntity(entity);
    }

    protected async _addBillboard(file: File, lonLat: LonLat) {
        const image = await loadImage(URL.createObjectURL(file));
        const scale = Math.min(1.0, MAX_BILLBOARD_SIZE / Math.max(image.width, image.height));
        this.markersLayer.add(
            new Entity({
                name: getBaseName(file),
                lonlat: lonLat,
                billboard: {
                    image,
                    width: Math.round(image.width * scale),
                    height: Math.round(image.height * scale)
                }
            })
        );
    }

    protected async _addTiff(file: File) {
        const layer = new GeoTIFFLayer(`__tif__${file.name}`, { src: file });
        this.tiffLayers.push(layer);
        this.planet!.addLayer(layer);
        try {
            await layer.whenReady();
        } catch (err) {
            this.tiffLayers.splice(this.tiffLayers.indexOf(layer), 1);
            layer.remove();
            throw err;
        }
    }
}
