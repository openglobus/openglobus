import { ProceduralTerrain } from "./ProceduralTerrain";
import type { IProceduralTerrainCommon, ProceduralHeights } from "./ProceduralTerrain";
import { TERRAIN_GRID_SIZE_BY_ZOOM } from "./terrainUtils";
import { GeoTIFFReader } from "../layer/geotiff/GeoTIFFReader";
import { MultiGeoTIFFReader } from "../layer/geotiff/MultiGeoTIFFReader";
import type { IGeoTIFFSourceCommon, IGeoTIFFSourceItem } from "../layer/geotiff/types";
import type { Extent } from "../Extent";
import type { LonLat } from "../LonLat";
import type { Segment } from "../segment/Segment";

export interface IGeoTiffTerrainParams extends IProceduralTerrainCommon, IGeoTIFFSourceCommon {
    sources?: IGeoTIFFSourceItem[];
    sampleSize?: number;
    band?: number;
}

/**
 * Terrain with the heights of a GeoTIFF or COG elevation band.
 * @class
 * @extends {ProceduralTerrain}
 * @param {string} [name="GeoTiffTerrain"] - Terrain provider name.
 * @param {IGeoTiffTerrainParams} options - Provider options:
 * @param {string | Blob | File | ArrayBuffer} [options.src] - GeoTIFF url or binary.
 * @param {Array.<IGeoTIFFSourceItem>} [options.sources] - GeoTIFF sources of one mosaic instead of src. Where they
 * overlap the heights of the first one are taken, so the more detailed ones go first.
 * @param {number} [options.sampleSize=256] - Pixels by the segment side read from the GeoTIFF, power of two,
 * not less than plainGridSize. The GeoTIFF overview is taken by them.
 * @param {number} [options.band=1] - Elevation band.
 * @param {string} [options.attribution=""] - Elevation source attribution shown in the attribution area.
 * @param {number} [options.plainGridSize=128] - Elevation grid size.
 * @param {number} [options.maxZoom=21] - Last zoom of the segment heights, the last zoom of the default grid sizes.
 * @param {number} [options.maxNativeZoom] - Last zoom of the GeoTIFF reads, by default, the first zoom which
 * sampleSize pixels are not larger than the GeoTIFF ones, of the most detailed source in a mosaic. The tile size is
 * the one of the planet quad tree strategy. Deeper segments are its subdivision levels.
 * @param {string} [options.geoidSrc="https://openglobus.org/geoid/egm84-30.pgm"] - Geoid of the heights.
 * @param {Array.<number>} [options.noDataValues=[-10000]] - Heights of no data, GeoTIFF nodata pixels
 * become the first one.
 * @param {number | null} [options.nodata] - GeoTIFF nodata value, from the GeoTIFF by default.
 * @param {number | string} [options.crs] - GeoTIFF CRS code, when the GeoTIFF has another one or none.
 */
class GeoTiffTerrain extends ProceduralTerrain {
    protected _reader: GeoTIFFReader | MultiGeoTIFFReader;
    protected _sampleSize: number;
    protected _samples: number[];
    protected _sourceReady: boolean;
    protected _readyPromise: Promise<void>;

    // The native zoom is found from the sources, and the root tile width it was found for
    protected _autoNativeZoom: boolean;
    protected _nativeZoomRootTileWidth: number;

    constructor(name: string | null, options: IGeoTiffTerrainParams) {
        super(name || "GeoTiffTerrain", {
            plainGridSize: 128,
            maxZoom: TERRAIN_GRID_SIZE_BY_ZOOM.length - 1,
            geoidSrc: "https://openglobus.org/geoid/egm84-30.pgm",
            noDataValues: [-10000],
            ...options,
            getHeights: (segment) => this._readHeights(segment)
        });

        this._sampleSize = options.sampleSize || 256;
        this._samples = [(options.band || 1) - 1];
        this._sourceReady = false;
        this._autoNativeZoom = options.maxNativeZoom == undefined;
        this._nativeZoomRootTileWidth = NaN;

        let init: Promise<unknown>;

        if (options.sources && options.sources.length) {
            const reader = new MultiGeoTIFFReader({ ...options, mosaic: true });
            this._reader = reader;
            init = reader.init(options.sources);
        } else {
            const reader = new GeoTIFFReader(options);
            this._reader = reader;
            init = reader.init(options.src!);
        }

        this._readyPromise = init
            .then(() => this._updateNativeZoom())
            .catch((err) => console.error(err))
            .then(() => {
                this._sourceReady = true;
            });
    }

    public get reader(): GeoTIFFReader | MultiGeoTIFFReader {
        return this._reader;
    }

    public whenReady(): Promise<void> {
        return this._readyPromise;
    }

    public override getExtent(): Extent {
        return this._reader.extentWgs84;
    }

    /**
     * Flies over the highest point of the GeoTIFF: the heights of the extent center may be not loaded or no data.
     * @public
     */
    public override flyExtent() {
        this._readyPromise.then(() => {
            if (this._reader.isReady) {
                this._planet?.flyExtent(this.getExtent(), this._reader.metadata?.bands[this._samples[0] + 1]?.max);
            }
        });
    }

    // The planet comes after the sources, so the native zoom is found again for the tile size of its strategy
    protected _updateNativeZoom() {
        const width = this._planet ? this._planet.quadTreeStrategy.rootTileWidth : 360;

        if (this._autoNativeZoom && this._reader.isReady && width !== this._nativeZoomRootTileWidth) {
            this._nativeZoomRootTileWidth = width;
            this.maxNativeZoom = Math.min(this._reader.getNativeZoom(width, this._sampleSize), this.maxZoom);
        }
    }

    public override loadTerrain(segment: Segment) {
        if (!this._sourceReady) {
            segment.terrainIsLoading = false;
            return;
        }
        this._updateNativeZoom();
        super.loadTerrain(segment);
    }

    public override getHeightAsync(lonLat: LonLat, callback: (h: number) => void, zoom?: number): boolean {
        if (this._sourceReady) {
            this._updateNativeZoom();
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
            .readTileRasters(segment, this._sampleSize, this._samples)
            .then((data) => data && data.rasters[0]);
    }
}

export { GeoTiffTerrain };
