export type PointerEventExt = PointerEvent & {
    offsetLeft: number;
    offsetTop: number,
    pointers: PointerEvent[];
};
type PointerHandlerEventCallback = (sys: PointerEventExt) => void;

class PointerHandler {

    protected $el: HTMLElement;

    protected _activePointers: Map<number, PointerEvent>;

    constructor(htmlObject: HTMLElement) {
        this.$el = htmlObject;
        this._activePointers = new Map();
    }

    public setEvent(event: string, sender: any, callback: PointerHandlerEventCallback) {

        let _this = this;

        switch (event) {
            case "pointercancel":
                this.$el.addEventListener('pointercancel', function (event: PointerEvent) {
                    event.preventDefault();
                    if (_this._activePointers.delete(event.pointerId)) {
                        const rect = this.getBoundingClientRect();
                        const eventExt: PointerEventExt = Object.assign(event, {
                            offsetLeft: rect.left,
                            offsetTop: rect.top,
                            pointers: [..._this._activePointers.values()]
                        });
                        callback.call(sender, eventExt);
                    }
                });
                break;

            case "pointerdown":
                this.$el.addEventListener('pointerdown', function (event: PointerEvent) {
                    event.preventDefault();
                    if (event.pointerType === "touch") {
                        _this._activePointers.set(event.pointerId, event);
                        const rect = this.getBoundingClientRect();
                        const eventExt: PointerEventExt = Object.assign(event, {
                            offsetLeft: rect.left,
                            offsetTop: rect.top,
                            pointers: [..._this._activePointers.values()]
                        });
                        callback.call(sender, eventExt);
                    }
                });
                break;

            case "pointerup":
                this.$el.addEventListener('pointerup', function (event: PointerEvent) {
                    event.preventDefault();
                    if (_this._activePointers.delete(event.pointerId)) {
                        const rect = this.getBoundingClientRect();
                        const eventExt: PointerEventExt = Object.assign(event, {
                            offsetLeft: rect.left,
                            offsetTop: rect.top,
                            pointers: [..._this._activePointers.values()]
                        });
                        callback.call(sender, eventExt);
                    }
                });
                break;

            case "pointermove":
                this.$el.addEventListener('pointermove', function (event: PointerEvent) {
                    event.preventDefault();
                    if (event.pointerType === "touch" && _this._activePointers.has(event.pointerId)) {
                        _this._activePointers.set(event.pointerId, event);
                        const rect = this.getBoundingClientRect();
                        const eventExt: PointerEventExt = Object.assign(event, {
                            offsetLeft: rect.left,
                            offsetTop: rect.top,
                            pointers: [..._this._activePointers.values()]
                        });
                        callback.call(sender, eventExt);
                    }
                });
                break;
        }
    }
}

export {PointerHandler};

