import { fromArrayBuffer, fromBlob, fromUrl, GeoTIFF, GeoTIFFImage } from "geotiff";
import type { ReadRastersOptions } from "geotiff";
import { getRasterMinMax, parseNoDataValue } from "./ColorScale";
import { isLonLatBBox, parseCrsCode, RasterReader } from "./RasterReader";
import type { IRasterWindow } from "./RasterReader";
import { acquireWorkerPool, type IWorkerPoolHandle } from "./workerPool";
import type { GeoTIFFSource, IBandStats, IGeoTIFFMetadata, IGeoTIFFReaderParams } from "./types";

export { parseCrsCode } from "./RasterReader";

/**
 * Size of a cached byte range of a remote file.
 */
const BLOCK_SIZE = 65536 * 4;

/**
 * Memory taken by cached byte ranges, the default cacheSize is derived from it.
 */
const BLOCK_CACHE_BYTES = 64 * Math.pow(1024, 2);

/**
 * Photometric interpretations that do not store RGB in the samples: CMYK, YCbCr and CIELab.
 * JPEG compressed imagery is usually YCbCr.
 */
const CONVERTED_PHOTOMETRICS = [5, 6, 8];

export class GeoTIFFReader extends RasterReader {
    public source: GeoTIFF | null = null;
    public images: GeoTIFFImage[] = [];

    /** Internal transparency mask of every entry of images, null when the file has none */
    public masks: (GeoTIFFImage | null)[] = [];

    private _poolHandle: IWorkerPoolHandle | null = null;
    private _convertPhotometric: boolean = false;

    constructor(options: IGeoTIFFReaderParams = {}) {
        super(options);
        this._logName = "GeoTIFFReader";
    }

    /**
     * Initializes and parses the GeoTIFF source and its overview pyramid.
     */
    public async init(src: GeoTIFFSource): Promise<IGeoTIFFMetadata> {
        let source: GeoTIFF;

        if (typeof src === "string") {
            source = await fromUrl(src, {
                blockSize: BLOCK_SIZE,
                cacheSize: Math.max(
                    1,
                    Math.round(BLOCK_CACHE_BYTES / (this.options.requestOptions?.blockSize || BLOCK_SIZE))
                ),
                ...this.options.requestOptions
            });
        } else if (
            src instanceof ArrayBuffer ||
            (typeof ArrayBuffer !== "undefined" && Object.prototype.toString.call(src) === "[object ArrayBuffer]")
        ) {
            source = await fromArrayBuffer(src as ArrayBuffer);
        } else if (ArrayBuffer.isView(src)) {
            const view = src as ArrayBufferView;
            const buf = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
            source = await fromArrayBuffer(buf as ArrayBuffer);
        } else if (
            (typeof Blob !== "undefined" && src instanceof Blob) ||
            (typeof File !== "undefined" && (src as any) instanceof File) ||
            (src && typeof (src as any).slice === "function" && typeof (src as any).size === "number")
        ) {
            source = await fromBlob(src as any);
        } else {
            throw new Error("Invalid GeoTIFF source provided.");
        }

        this.source = source;
        this._destroyed = false;

        // Initialize Web Worker Pool for decoding if supported, releasing a lease
        // a previous init() may have taken
        this._release();
        this._poolHandle = acquireWorkerPool(this.options);
        this.workerPool = this._poolHandle.pool;

        const imageCount = await source.getImageCount();
        this.images = [];

        const maskImages: GeoTIFFImage[] = [];

        for (let i = 0; i < imageCount; i++) {
            const img = await source.getImage(i);

            // In NewSubfileType bit 0 is an overview and bit 2 is a transparency mask
            const subfileType = Number(img.getFileDirectory().getValue("NewSubfileType") ?? 0);
            const isMask = (subfileType & 4) === 4;

            if (isMask) {
                maskImages.push(img);
            } else if (i === 0 || (subfileType & 1) === 1) {
                this.images.push(img);
            }
        }

        // A mask has the size of the level it belongs to
        this.masks = this.images.map(
            (img) =>
                maskImages.find((m) => m.getWidth() === img.getWidth() && m.getHeight() === img.getHeight()) ?? null
        );

        const baseImage = this.images[0];
        this.reverseY = this._checkIfReversed(baseImage);

        // Bounding box in native coordinates [minX, minY, maxX, maxY]
        const bbox = baseImage.getBoundingBox() as [number, number, number, number];

        // Determine CRS
        const geoKeys = baseImage.getGeoKeys() || {};
        let crsCode = +(geoKeys.ProjectedCSTypeGeoKey || geoKeys.GeographicTypeGeoKey || 0);

        const forcedCrs = parseCrsCode(this.options.crs);
        if (forcedCrs) {
            crsCode = forcedCrs;
        } else if (crsCode === 32767 || crsCode === 65535 || !crsCode) {
            crsCode = isLonLatBBox(bbox) ? 4326 : 3857;
        }

        await this._setGeoreference(bbox, crsCode);

        const samplesPerPixel = baseImage.getSamplesPerPixel();

        // GeoTIFF is a color image in another color space, readRGB() returns it as RGB
        const photometric = Number(baseImage.getFileDirectory().getValue("PhotometricInterpretation") ?? 2);
        this._convertPhotometric = CONVERTED_PHOTOMETRICS.indexOf(photometric) !== -1;

        const gdalNoData = parseNoDataValue(baseImage.getGDALNoData());
        const userNoData = this._getUserNoData();
        const noData = userNoData !== undefined ? userNoData : (gdalNoData ?? null);

        // Sample band min/max statistics from metadata or thumbnail overview
        const bands: Record<number, IBandStats> = {};
        const previewImage = this.images[this.images.length - 1];

        if (samplesPerPixel >= 3) {
            for (let i = 0; i < samplesPerPixel; i++) {
                const bandNum = i + 1;
                const meta = await baseImage.getGDALMetadata(i);
                if (meta?.STATISTICS_MINIMUM && meta?.STATISTICS_MAXIMUM) {
                    bands[bandNum] = {
                        min: parseFloat(String(meta.STATISTICS_MINIMUM)),
                        max: parseFloat(String(meta.STATISTICS_MAXIMUM))
                    };
                } else {
                    bands[bandNum] = { min: 0, max: 255 };
                }
            }
        } else {
            let needsSampling = false;
            for (let i = 0; i < samplesPerPixel; i++) {
                const bandNum = i + 1;
                const meta = await baseImage.getGDALMetadata(i);
                if (meta?.STATISTICS_MINIMUM && meta?.STATISTICS_MAXIMUM) {
                    bands[bandNum] = {
                        min: parseFloat(String(meta.STATISTICS_MINIMUM)),
                        max: parseFloat(String(meta.STATISTICS_MAXIMUM))
                    };
                } else {
                    needsSampling = true;
                }
            }

            if (needsSampling && previewImage) {
                try {
                    const sampleRasters = await previewImage.readRasters({
                        interleave: false,
                        pool: this.workerPool || undefined
                    });
                    for (let i = 0; i < samplesPerPixel; i++) {
                        const bandNum = i + 1;
                        if (!bands[bandNum]) {
                            bands[bandNum] = getRasterMinMax(sampleRasters[i], noData);
                        }
                    }
                } catch {
                    for (let i = 0; i < samplesPerPixel; i++) {
                        const bandNum = i + 1;
                        if (!bands[bandNum]) {
                            bands[bandNum] = { min: 0, max: 255 };
                        }
                    }
                }
            }
        }

        this.metadata = {
            bbox: this.nativeBBox,
            crsCode: this.crsCode,
            crsResolved: this.crsResolved,
            width: baseImage.getWidth(),
            height: baseImage.getHeight(),
            samplesPerPixel,
            noData,
            isTiled: baseImage.isTiled,
            overviewCount: this.images.length,
            bands
        };

        this.isReady = true;
        return this.metadata;
    }

    protected _levelCount(): number {
        return this.source ? this.images.length : 0;
    }

    protected _levelSize(level: number): [number, number] {
        const image = this.images[level];
        return [image.getWidth(), image.getHeight()];
    }

    protected async _readWindow(
        level: number,
        window: [number, number, number, number],
        samples?: number[]
    ): Promise<IRasterWindow> {
        const image = this.images[level];
        const mask = this.masks[level];

        const options: ReadRastersOptions & { interleave: false } = {
            window,
            pool: this.workerPool || undefined,
            fillValue: this._getFillValue(),
            interleave: false
        };

        if (samples) {
            options.samples = samples;
        }

        const read = () =>
            Promise.all([
                // readRGB() converts the samples of a non RGB color space and returns R, G and B
                this._convertPhotometric
                    ? image.readRGB({
                          window: options.window,
                          pool: options.pool,
                          interleave: false
                      })
                    : image.readRasters(options),
                // The mask covers the same window as the image and marks the valid pixels of the file
                mask
                    ? mask.readRasters({
                          window: options.window,
                          pool: options.pool,
                          samples: [0],
                          interleave: false
                      })
                    : undefined
            ]);

        // Concurrent reads may lose their blocks when the block cache is full, geotiff throws AggregateError then,
        // the second read loads them again. Other errors go to the caller, a failed tile is not taken as empty.
        const [rasters, maskRasters] = await read().catch((err) => {
            if (err instanceof AggregateError) {
                return read();
            }
            throw err;
        });

        return { rasters, mask: maskRasters?.[0] };
    }

    private _checkIfReversed(image: GeoTIFFImage): boolean {
        const fileDirectory = image.getFileDirectory();

        const pixelScale = fileDirectory.getValue("ModelPixelScale");

        if (pixelScale && pixelScale[1] < 0) {
            return true;
        }

        const transform = fileDirectory.getValue("ModelTransformation");

        if (transform && transform[7] > transform[3]) {
            return true;
        }

        return false;
    }

    protected override _release(): void {
        if (this._poolHandle) {
            this._poolHandle.release();
            this._poolHandle = null;
        }
        this.workerPool = null;
    }

    /**
     * Cleans up worker pool and cached images.
     */
    public override destroy(): void {
        this.images = [];
        this.masks = [];
        this.source = null;
        super.destroy();
    }
}
