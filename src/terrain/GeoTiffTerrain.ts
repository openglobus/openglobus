import { ProceduralTerrain } from "./ProceduralTerrain";
import type { IProceduralTerrainParams, ProceduralHeights } from "./ProceduralTerrain";
import { TERRAIN_GRID_SIZE_BY_ZOOM } from "./terrainUtils";
import { GeoTIFFReader } from "../layer/geotiff/GeoTIFFReader";
import type { IGeoTIFFMetadata, IGeoTIFFSourceCommon } from "../layer/geotiff/types";
import type { LonLat } from "../LonLat";
import type { Segment } from "../segment/Segment";

export interface IGeoTiffTerrainParams extends Omit<IProceduralTerrainParams, "getHeights">, IGeoTIFFSourceCommon {
    sampleSize?: number;
    band?: number;
}

/**
 * Terrain with the heights of a GeoTIFF or COG elevation band.
 * @class
 * @extends {ProceduralTerrain}
 * @param {string} [name="GeoTiffTerrain"] - Terrain provider name.
 * @param {IGeoTiffTerrainParams} options - Provider options:
 * @param {string | Blob | File | ArrayBuffer} options.src - GeoTIFF url or binary.
 * @param {number} [options.sampleSize=256] - Pixels by the segment side read from the GeoTIFF, power of two,
 * not less than plainGridSize. The GeoTIFF overview is taken by them.
 * @param {number} [options.band=1] - Elevation band.
 * @param {number} [options.plainGridSize=128] - Elevation grid size.
 * @param {number} [options.maxZoom=21] - Last zoom of the segment heights, the last zoom of the default grid sizes.
 * @param {number} [options.maxNativeZoom] - Last zoom of the GeoTIFF reads, by default the first zoom which
 * sampleSize pixels are not larger than the GeoTIFF ones. Deeper segments are its subdivision levels.
 * @param {string} [options.geoidSrc="https://openglobus.org/geoid/egm84-30.pgm"] - Geoid of the heights.
 * @param {Array.<number>} [options.noDataValues=[-10000]] - Heights of no data, GeoTIFF nodata pixels
 * become the first one.
 * @param {number | null} [options.nodata] - GeoTIFF nodata value, from the GeoTIFF by default.
 * @param {number | string} [options.crs] - GeoTIFF CRS code, when the GeoTIFF has another one or none.
 */
class GeoTiffTerrain extends ProceduralTerrain {
    protected _reader: GeoTIFFReader;
    protected _sampleSize: number;
    protected _samples: number[];
    protected _sourceReady: boolean;
    protected _readyPromise: Promise<void>;

    constructor(name: string | null, options: IGeoTiffTerrainParams) {
        super(name || "GeoTiffTerrain", {
            plainGridSize: 128,
            maxZoom: TERRAIN_GRID_SIZE_BY_ZOOM.length - 1,
            geoidSrc: "https://openglobus.org/geoid/egm84-30.pgm",
            noDataValues: [-10000],
            ...options,
            getHeights: (segment) => this._readHeights(segment)
        });

        this._reader = new GeoTIFFReader(options);
        this._sampleSize = options.sampleSize || 256;
        this._samples = [(options.band || 1) - 1];
        this._sourceReady = false;

        this._readyPromise = this._reader
            .init(options.src!)
            .then((meta) => {
                if (options.maxNativeZoom == undefined) {
                    this.maxNativeZoom = Math.min(this._getNativeZoom(meta), this.maxZoom);
                }
            })
            .catch((err) => console.error(err))
            .then(() => {
                this._sourceReady = true;
            });
    }

    public get reader(): GeoTIFFReader {
        return this._reader;
    }

    public whenReady(): Promise<void> {
        return this._readyPromise;
    }

    // The first zoom which tile pixels are not larger than the GeoTIFF ones, a tile is 360 degrees by 2^zoom
    protected _getNativeZoom(meta: IGeoTIFFMetadata): number {
        let pixel = this._reader.extentWgs84.getWidth() / meta.width;
        return Math.ceil(Math.log2(360 / (this._sampleSize * pixel)) - 1e-6);
    }

    public override loadTerrain(segment: Segment) {
        if (!this._sourceReady) {
            segment.terrainIsLoading = false;
            return;
        }
        super.loadTerrain(segment);
    }

    public override getHeightAsync(lonLat: LonLat, callback: (h: number) => void, zoom?: number): boolean {
        if (this._sourceReady) {
            return super.getHeightAsync(lonLat, callback, zoom);
        }
        this._readyPromise.then(() => super.getHeightAsync(lonLat, callback, zoom));
        return false;
    }

    protected _readHeights(segment: Segment): ProceduralHeights | Promise<ProceduralHeights> {
        let extent = segment.getExtentLonLat();

        if (!this._reader.extentWgs84.overlaps(extent)) {
            return null;
        }

        return this._reader
            .readTileRasters(extent, segment.tileZoom, this._sampleSize, this._samples, segment._projection)
            .then((data) => data && data.rasters[0]);
    }
}

export { GeoTiffTerrain };
