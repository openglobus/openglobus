import {Button} from "../../ui/Button";
import {View} from "../../ui/View";
import {IDialogParams, Dialog} from "../../ui/Dialog";
import {ElevationProfileScene} from "./ElevationProfileScene";
import {LonLat} from "../../LonLat";

const LIST_TEMPLATE =
    `<div class="og-elevationprofile-list">
        <textarea placeholder="[[lon, lat, height], [lon, lat, height], ..., [lon, lat, height]]"></textarea>
        <div class="og-elevationprofile-list-buttons"></div>
    </div>`;

interface IPointListDialog extends IDialogParams {
    model: ElevationProfileScene;
}

class PointListDialog extends Dialog<ElevationProfileScene> {

    public $textarea: HTMLTextAreaElement | null;

    constructor(params: IPointListDialog) {
        super({
            title: "Points List",
            visible: false,
            resizable: true,
            useHide: true,
            top: 100,
            left: 700,
            width: 400,
            height: 300,
            minHeight: 100,
            minWidth: 100,
            ...params
        });

        this.$textarea = null;
    }

    public override render(params?: any): this {
        super.render(params);

        let view = new View({
            template: LIST_TEMPLATE
        })
        view.appendTo(this.container!);

        let applyBtn = new Button({
            classList: ["og-elevationprofile-list-apply"],
            icon: "Apply"
        });
        applyBtn.appendTo(view.select(".og-elevationprofile-list-buttons")!);

        applyBtn.events.on("click", this._onApplyClick);

        this.$textarea = view.select("textarea");

        return this;
    }

    protected _onApplyClick = () => {
        try {
            this.model.clear();
            let coordsArr = JSON.parse(this.$textarea!.value);
            let lonLatArr: LonLat[] = new Array(coordsArr.length);
            for (let i = 0; i < coordsArr.length; i++) {
                let ci = coordsArr[i];
                lonLatArr[i] = new LonLat(ci[0], ci[1], ci[2]);
            }
            this.model.addPointLonLatArrayAsync(lonLatArr);
        } catch (err) {
            console.error(err);
        }
    }
}

export {PointListDialog};