import {Control, IControlParams} from "./Control";
import {Dialog} from "../ui/Dialog";
import {ToggleButton} from "../ui/ToggleButton";
import {GlobusTerrain} from "../terrain/GlobusTerrain";
import {CanvasTiles} from "../layer/CanvasTiles";

const ICON_LOCK_BUTTON_SVG = `<?xml version="1.0" encoding="utf-8"?>
<!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
<svg fill="#000000" width="800px" height="800px" viewBox="-7.5 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
<title>lock</title>
<path d="M14.625 15.156h2.094c0.281 0 0.5 0.25 0.5 0.531v11c0 0.281-0.219 0.5-0.5 0.5h-16.219c-0.281 0-0.5-0.219-0.5-0.5v-11c0-0.281 0.219-0.531 0.5-0.531h2.031v-5.125c0-2.875 1.844-5.25 4.688-5.25h2.688c2.875 0 4.719 2.375 4.719 5.25v5.125zM5.188 15.156h6.813v-4.875c0-1.594-1.313-2.938-2.938-2.938h-0.969c-1.594 0-2.906 1.344-2.906 2.938v4.875zM7.156 24h2.906l-0.719-3.156c0.5-0.25 0.844-0.781 0.844-1.375 0-0.906-0.719-1.594-1.594-1.594s-1.563 0.688-1.563 1.594c0 0.594 0.344 1.125 0.844 1.375z"></path>
</svg>`;

const ICON_BUTTON_SVG = `<?xml version="1.0" encoding="iso-8859-1"?>
<!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg fill="#000000" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
\t width="800px" height="800px" viewBox="0 0 932.179 932.179"
\t xml:space="preserve">
<g>
\t<path d="M61.2,341.538c4.9,16.8,11.7,33,20.3,48.2l-24.5,30.9c-8,10.1-7.1,24.5,1.9,33.6l42.2,42.2c9.1,9.1,23.5,9.899,33.6,1.899
\t\tl30.7-24.3c15.8,9.101,32.6,16.2,50.1,21.2l4.6,39.5c1.5,12.8,12.3,22.4,25.1,22.4h59.7c12.8,0,23.6-9.601,25.1-22.4l4.4-38.1
\t\tc18.8-4.9,36.8-12.2,53.7-21.7l29.7,23.5c10.1,8,24.5,7.1,33.6-1.9l42.2-42.2c9.1-9.1,9.9-23.5,1.9-33.6l-23.1-29.3
\t\tc9.6-16.601,17.1-34.3,22.1-52.8l35.6-4.1c12.801-1.5,22.4-12.3,22.4-25.1v-59.7c0-12.8-9.6-23.6-22.4-25.1l-35.1-4.1
\t\tc-4.801-18.3-12-35.8-21.199-52.2l21.6-27.3c8-10.1,7.1-24.5-1.9-33.6l-42.1-42.1c-9.1-9.1-23.5-9.9-33.6-1.9l-26.5,21
\t\tc-17.2-10.1-35.601-17.8-54.9-23l-4-34.3c-1.5-12.8-12.3-22.4-25.1-22.4h-59.7c-12.8,0-23.6,9.6-25.1,22.4l-4,34.3
\t\tc-19.8,5.3-38.7,13.3-56.3,23.8l-27.5-21.8c-10.1-8-24.5-7.1-33.6,1.9l-42.2,42.2c-9.1,9.1-9.9,23.5-1.9,33.6l23,29.1
\t\tc-9.2,16.6-16.2,34.3-20.8,52.7l-36.8,4.2c-12.8,1.5-22.4,12.3-22.4,25.1v59.7c0,12.8,9.6,23.6,22.4,25.1L61.2,341.538z
\t\t M277.5,180.038c54.4,0,98.7,44.3,98.7,98.7s-44.3,98.7-98.7,98.7c-54.399,0-98.7-44.3-98.7-98.7S223.1,180.038,277.5,180.038z"/>
\t<path d="M867.699,356.238l-31.5-26.6c-9.699-8.2-24-7.8-33.199,0.9l-17.4,16.3c-14.699-7.1-30.299-12.1-46.4-15l-4.898-24
\t\tc-2.5-12.4-14-21-26.602-20l-41.1,3.5c-12.6,1.1-22.5,11.4-22.9,24.1l-0.799,24.4c-15.801,5.7-30.701,13.5-44.301,23.3
\t\tl-20.799-13.8c-10.602-7-24.701-5-32.9,4.7l-26.6,31.7c-8.201,9.7-7.801,24,0.898,33.2l18.201,19.399
\t\tc-6.301,14.2-10.801,29.101-13.4,44.4l-26,5.3c-12.4,2.5-21,14-20,26.601l3.5,41.1c1.1,12.6,11.4,22.5,24.1,22.9l28.1,0.899
\t\tc5.102,13.4,11.801,26.101,19.9,38l-15.699,23.7c-7,10.6-5,24.7,4.699,32.9l31.5,26.6c9.701,8.2,24,7.8,33.201-0.9l20.6-19.3
\t\tc13.5,6.3,27.699,11,42.299,13.8l5.701,28.2c2.5,12.4,14,21,26.6,20l41.1-3.5c12.6-1.1,22.5-11.399,22.9-24.1l0.9-27.601
\t\tc15-5.3,29.199-12.5,42.299-21.399l22.701,15c10.6,7,24.699,5,32.9-4.7l26.6-31.5c8.199-9.7,7.799-24-0.9-33.2l-18.301-19.399
\t\tc6.701-14.2,11.602-29.2,14.4-44.601l25-5.1c12.4-2.5,21-14,20-26.601l-3.5-41.1c-1.1-12.6-11.4-22.5-24.1-22.9l-25.1-0.8
\t\tc-5.201-14.6-12.201-28.399-20.9-41.2l13.699-20.6C879.4,378.638,877.4,364.438,867.699,356.238z M712.801,593.837
\t\tc-44.4,3.801-83.602-29.3-87.301-73.699c-3.801-44.4,29.301-83.601,73.699-87.301c44.4-3.8,83.602,29.301,87.301,73.7
\t\tC790.301,550.938,757.199,590.138,712.801,593.837z"/>
\t<path d="M205,704.438c-12.6,1.3-22.3,11.899-22.4,24.6l-0.3,25.3c-0.2,12.7,9.2,23.5,21.8,25.101l18.6,2.399
\t\tc3.1,11.301,7.5,22.101,13.2,32.301l-12,14.8c-8,9.899-7.4,24.1,1.5,33.2l17.7,18.1c8.9,9.1,23.1,10.1,33.2,2.3l14.899-11.5
\t\tc10.5,6.2,21.601,11.101,33.2,14.5l2,19.2c1.3,12.6,11.9,22.3,24.6,22.4l25.301,0.3c12.699,0.2,23.5-9.2,25.1-21.8l2.3-18.2
\t\tc12.601-3.101,24.601-7.8,36-14l14,11.3c9.9,8,24.101,7.4,33.201-1.5l18.1-17.7c9.1-8.899,10.1-23.1,2.301-33.2L496.6,818.438
\t\tc6.6-11,11.701-22.7,15.201-35l16.6-1.7c12.6-1.3,22.299-11.9,22.4-24.6l0.299-25.301c0.201-12.699-9.199-23.5-21.799-25.1
\t\tl-16.201-2.1c-3.1-12.2-7.699-24-13.699-35l10.1-12.4c8-9.9,7.4-24.1-1.5-33.2l-17.699-18.1c-8.9-9.101-23.102-10.101-33.201-2.3
\t\tl-12.101,9.3c-11.399-6.9-23.6-12.2-36.399-15.8l-1.601-15.7c-1.3-12.601-11.899-22.3-24.6-22.4l-25.3-0.3
\t\tc-12.7-0.2-23.5,9.2-25.101,21.8l-2,15.601c-13.199,3.399-25.899,8.6-37.699,15.399l-12.5-10.2c-9.9-8-24.101-7.399-33.201,1.5
\t\tl-18.2,17.801c-9.1,8.899-10.1,23.1-2.3,33.199l10.7,13.801c-6.2,11-11.1,22.699-14.3,35L205,704.438z M368.3,675.837
\t\tc36.3,0.4,65.399,30.301,65,66.601c-0.4,36.3-30.301,65.399-66.601,65c-36.3-0.4-65.399-30.3-65-66.601
\t\tC302.1,704.538,332,675.438,368.3,675.837z"/>
</g>
</svg>`;

const ICON_CANVASTILES_SVG = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M 4 4 L 4 8 L 8 8 L 8 4 L 4 4 z M 10 4 L 10 8 L 14 8 L 14 4 L 10 4 z M 16 4 L 16 8 L 20 8 L 20 4 L 16 4 z M 4 10 L 4 14 L 8 14 L 8 10 L 4 10 z M 10 10 L 10 14 L 14 14 L 14 10 L 10 10 z M 16 10 L 16 14 L 20 14 L 20 10 L 16 10 z M 4 16 L 4 20 L 8 20 L 8 16 L 4 16 z M 10 16 L 10 20 L 14 20 L 14 16 L 10 16 z M 16 16 L 16 20 L 20 20 L 20 16 L 16 16 z"/>
</svg>`;

export interface IDebugInfoWatch {
    label: string;
    valEl?: HTMLElement;
    frame?: () => string | number;
}

interface IDebugInfoParams extends IControlParams {
    watch?: IDebugInfoWatch[];
}

export class DebugInfo extends Control {
    public el: HTMLElement | null;
    protected _watch: IDebugInfoWatch[];
    protected _toggleBtn: ToggleButton;
    protected _dialog: Dialog<null>;

    protected _canvasTiles: CanvasTiles;

    constructor(options: IDebugInfoParams = {}) {
        if (!options.name || options.name === "") {
            options.name = "DebugInfo";
        }
        super(options);
        this.el = null;
        this._watch = options.watch || [];

        this._toggleBtn = new ToggleButton({
            classList: ["og-map-button", "og-debuginfo_button"],
            icon: ICON_BUTTON_SVG
        });

        this._dialog = new Dialog({
            title: "Debug Info",
            visible: false,
            useHide: true,
            top: 120,
            left: 60,
            width: 480
        });

        this._dialog.events.on("visibility", (v: boolean) => {
            this._toggleBtn.setActive(v);
        });

        this._canvasTiles = new CanvasTiles("Tile grid", {
            visibility: true,
            isBaseLayer: false,
            drawTile: function (material: any, applyCanvas: any) {

                //
                // This is important create canvas here!
                //
                let cnv = document.createElement("canvas");
                let ctx = cnv.getContext("2d")!;
                cnv.width = 256;
                cnv.height = 256;

                //Clear canvas
                ctx.clearRect(0, 0, cnv.width, cnv.height);

                //Draw border
                ctx.beginPath();
                ctx.rect(0, 0, cnv.width, cnv.height);
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'black';
                ctx.stroke();

                let size;

                if (material.segment.isPole) {
                    let ext = material.segment.getExtentLonLat();

                    ctx.fillStyle = 'black';
                    ctx.font = 'normal ' + 29 + 'px Verdana';

                    ctx.textAlign = 'center';
                    ctx.fillText(`${ext.northEast.lon.toFixed(3)} ${ext.northEast.lat.toFixed(3)}`, cnv.width / 2, cnv.height / 2 + 20);
                    ctx.fillText(`${ext.southWest.lon.toFixed(3)} ${ext.southWest.lat.toFixed(3)}`, cnv.width / 2, cnv.height / 2 - 20);
                } else {
                    //Draw text
                    if (material.segment.tileZoom > 14) {
                        size = "26";
                    } else {
                        size = "32";
                    }
                    ctx.fillStyle = 'black';
                    ctx.font = 'normal ' + size + 'px Verdana';
                    ctx.textAlign = 'center';
                    ctx.fillText(material.segment.tileX + "," + material.segment.tileY + "," + material.segment.tileZoom, cnv.width / 2, cnv.height / 2);
                }

                //Draw canvas tile
                applyCanvas(cnv);
            }
        });
    }

    public addWatches(watches: IDebugInfoWatch[]) {
        for (let i = 0; i < watches.length; i++) {
            this.addWatch(watches[i]);
        }
    }

    public addWatch(watch: IDebugInfoWatch) {
        this._watch.push(watch);
        let watchEl = document.createElement("div");
        watchEl.classList.add("og-watch-line");
        watchEl.innerHTML = `<div class="og-watch-label">${watch.label}</div><div class="og-watch-value"></div>`;
        watch.valEl = watchEl.querySelector<HTMLElement>(".og-watch-value")!;
        this.el!.appendChild(watchEl);
    }

    public override oninit() {

        this._toggleBtn.appendTo(this.renderer!.div!);
        this._dialog.appendTo(this.renderer!.div!);
        this._toggleBtn.events.on("change", (isActive: boolean) => {
            this._dialog.setVisibility(isActive);
        });

        this.el = document.createElement("div");
        this.el.className = "og-debug-info";

        let $controls = document.createElement("div");
        $controls.classList.add("og-debuginfo_controls");
        this.el.appendChild($controls);

        let temp = this._watch;
        this._watch = [];
        for (let i = 0; i < temp.length; i++) {
            this.addWatch(temp[i]);
        }
        this._dialog.container?.appendChild(this.el);
        this.renderer!.events.on("draw", this._frame, this);

        let p = this.planet!;

        if (p) {
            this.addWatches([
                {
                    label: "Nodes count",
                    frame: () => p!._renderedNodes.length
                },
                {
                    label: "Planet._fadingNodes",
                    frame: () => p._fadingNodes.size
                },
                {
                    label: "createdNodes",
                    frame: () => p._createdNodesCount
                },
                {
                    label: "indexesCache",
                    frame: () => p._indexesCacheToRemoveCounter
                },
                {
                    label: "distBeforeMemClear",
                    frame: () => Math.round(p._distBeforeMemClear)
                },
                {
                    label: "maxZoom/minZoom",
                    frame: () => p.maxCurrZoom + " / " + p?.minCurrZoom
                },
                {
                    label: "viewExtent",
                    frame: () => p.getViewExtent().toString()
                },
                {
                    label: "height/alt (km)",
                    frame: () =>
                        `<div style="width:190px">${(p.camera._lonLat.height / 1000.0).toFixed(2) +
                        " / " +
                        (p.camera.getAltitude() / 1000.0).toFixed(2)}</div>`
                },
                {
                    label: "cam.slope",
                    frame: () => p.camera.slope.toFixed(3)
                },
                {
                    label: "lodSize",
                    frame: () => Math.round(p.lodSize)
                },
                {
                    label: "deltaTime/FPS",
                    frame: () =>
                        `<div style="width:70px"><div style="width:20px; float: left;">
                        ${Math.round(p.renderer!.handler.deltaTime)}
                        </div> <div style="float: left">
                        ${Math.round(1000.0 / p.renderer!.handler.deltaTime)}
                        </div></div>`
                },
                {
                    label: "-------------------------"
                },
                {
                    label: "_renderCompleted / renderCompletedActivated",
                    frame: () => `${p._renderCompleted} / ${p._renderCompletedActivated}`
                },
                {
                    label: "_terrainCompleted / terrainCompletedActivated",
                    frame: () => `${p._terrainCompleted} / ${p._terrainCompletedActivated}`
                },
                {
                    label: "PlainWorker",
                    frame: () => p._plainSegmentWorker.pendingQueue.length
                },
                {
                    label: "TileLoader",
                    frame: () => `${p._tileLoader.loading} ${p._tileLoader.queue.length}`
                },
                {
                    label: "TerrainLoader",
                    frame: () => {
                        if (p.terrain && !p.terrain.isEmpty) {
                            return `${(p.terrain as GlobusTerrain).loader.loading}  ${(p.terrain as GlobusTerrain).loader.queue.length}`
                        }
                        return "";
                    }
                },
                {
                    label: "TerrainWorker",
                    frame: () => p._terrainWorker.pendingQueue.length
                },
                {
                    label: "NormalMapCreator",
                    frame: () => p._normalMapCreator.queueSize
                },
                {
                    label: "VectorTileCreator",
                    frame: () => p._vectorTileCreator.queueSize
                }
            ]);
        }

        let lockTreeBtn = new ToggleButton({
            classList: ["og-debuginfo_controls-button"],
            icon: ICON_LOCK_BUTTON_SVG,
            title: "Lock/Unlock quad tree"
        });
        lockTreeBtn.appendTo($controls);

        lockTreeBtn.events.on("change", (isActive: boolean) => {
            if (isActive) {
                p.lockQuadTree();
            } else {
                p.unlockQuadTree();
            }
        });

        let canvasTilesBtn = new ToggleButton({
            classList: ["og-debuginfo_controls-button"],
            icon: ICON_CANVASTILES_SVG,
            title: "Show/Hide grid"
        });
        canvasTilesBtn.appendTo($controls);

        canvasTilesBtn.events.on("change", (isActive: boolean) => {
            if (isActive) {
                this.planet!.addLayer(this._canvasTiles);
            } else {
                this._canvasTiles.remove();
            }
        });
    }

    protected _frame() {
        for (let i = 0; i < this._watch.length; i++) {
            let w = this._watch[i];
            w.valEl!.innerHTML = w.frame ? String(w.frame()) : "";
        }
    }
}