import { GeoTIFFLayer } from "./GeoTIFFLayer";
import {
    GeoZarrReader,
    type GeoZarrDimensionValue,
    type IGeoTIFFLayerParams,
    type IGeoTIFFReader,
    type IGeoZarrDimension,
    type IGeoZarrReaderParams
} from "./geotiff";

export interface IGeoZarrLayerParams
    extends Omit<IGeoTIFFLayerParams, "src" | "sources" | "mosaic" | "requestOptions">, IGeoZarrReaderParams {
    /** URL of the GeoZarr multiscales group, or of the store with the group option. */
    url: string;
}

/**
 * GeoZarrLayer renders GeoZarr datacubes (Zarr v2 and v3) with the rendering options of the GeoTIFFLayer.
 *
 * Every band array, or every entry of a dimension list, is a band of the render options, numbered from 1 in
 * their order. Other extra dimensions, such as time or depth, are selected with setDimensions().
 *
 * @example
 * const layer = new GeoZarrLayer("Sentinel-2", {
 *     url: "https://example.com/S2.zarr/measurements/reflectance",
 *     bands: ["b04", "b03", "b02"],
 *     renderOptions: { multi: { r: { band: 1 }, g: { band: 2 }, b: { band: 3 } } }
 * });
 */
export class GeoZarrLayer extends GeoTIFFLayer {
    constructor(name: string | null, options: IGeoZarrLayerParams) {
        super(name, { ...options, src: options.url } as IGeoTIFFLayerParams);
    }

    public override get instanceName(): string {
        return "GeoZarrLayer";
    }

    public override get reader(): GeoZarrReader {
        return this._reader as GeoZarrReader;
    }

    protected override _createReader(options: IGeoTIFFLayerParams): IGeoTIFFReader {
        return new GeoZarrReader(options as IGeoZarrReaderParams);
    }

    /**
     * Returns the extra dimensions of the variable, such as time, band or depth.
     */
    public getDimensions(): IGeoZarrDimension[] {
        return this.reader.getDimensions();
    }

    /**
     * Returns the selected index or label of every set extra dimension.
     */
    public getDimensionValues(): Record<string, GeoZarrDimensionValue> {
        return this.reader.getDimensionValues();
    }

    /**
     * Selects other entries of the extra dimensions and reloads the tiles, the shown ones keep their images until
     * the new ones are read.
     *
     * @param dimensions - Index (number) or coordinate label (string) by dimension name.
     */
    public setDimensions(dimensions: Record<string, GeoZarrDimensionValue>): void {
        this.reader.setDimensions(dimensions);
        this._refreshTiles();
    }
}
