import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

export type GeoTiffType = "terrain" | "layer";

interface IGeoTiffTypeDialogParams {
    fileName: string;
    onClose: (type: GeoTiffType | null) => void;
}

/**
 * Asks how to add a GeoTIFF. The dialog answers null when it is closed without a choice.
 * @class
 * @extends {Dialog}
 * @param {IGeoTiffTypeDialogParams} params - Options:
 * @param {string} params.fileName - File name, shown as a plain text.
 * @param {Function} params.onClose - Takes the answer when the dialog is closed.
 */
class GeoTiffTypeDialog extends Dialog<null> {
    protected _fileName: string;
    protected _onClose: (type: GeoTiffType | null) => void;
    protected _type: GeoTiffType | null;

    constructor(params: IGeoTiffTypeDialogParams) {
        super({
            title: "Add GeoTIFF",
            classList: ["og-geotiff-type"],
            resizable: false,
            width: 300
        });

        this._fileName = params.fileName;
        this._onClose = params.onClose;
        this._type = null;
    }

    public override render(params?: any): this {
        super.render(params);

        const $body = document.createElement("div");
        $body.classList.add("og-geotiff-type__body");

        const $file = document.createElement("div");
        $file.classList.add("og-geotiff-type__file");
        $file.textContent = this._fileName;
        $file.title = this._fileName;
        $body.appendChild($file);

        const $question = document.createElement("div");
        $question.textContent = "Add the file as a terrain or as a raster layer?";
        $body.appendChild($question);

        const $buttons = document.createElement("div");
        $buttons.classList.add("og-geotiff-type__buttons");
        $body.appendChild($buttons);

        this._appendButton($buttons, "Terrain", "terrain");
        this._appendButton($buttons, "Layer", "layer");

        this.container!.appendChild($body);

        return this;
    }

    protected _appendButton($parent: HTMLElement, text: string, type: GeoTiffType) {
        const btn = new Button({ classList: ["og-geotiff-type__button"], text });
        btn.appendTo($parent);
        btn.events.on("click", () => {
            this._type = type;
            this.close();
        });
    }

    public override remove() {
        super.remove();
        this._onClose(this._type);
    }
}

export { GeoTiffTypeDialog };
