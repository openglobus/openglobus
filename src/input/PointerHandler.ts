export type PointerEventExt = PointerEvent & {
    offsetLeft: number;
    offsetTop: number,
    pointers: PointerEvent[];
    activePointers: Map<number, PointerEvent>;
};
type PointerHandlerEventCallback = (sys: PointerEventExt) => void;

class PointerHandler {

    protected $el: HTMLElement;

    protected _activePointers: Map<number, PointerEvent>;

    constructor(htmlObject: HTMLElement) {
        this.$el = htmlObject;
        this.$el.style.touchAction = 'none';
        this.$el.style.userSelect = 'none';
        this._activePointers = new Map();
    }

    public setEvent(event: string, sender: any, callback: PointerHandlerEventCallback) {

        let _this = this;

        switch (event) {
            case "pointercancel":
                this.$el.addEventListener('pointercancel', function (event: PointerEvent) {
                    if (_this._activePointers.delete(event.pointerId)) {
                        const rect = this.getBoundingClientRect();
                        const eventExt: PointerEventExt = Object.assign(event, {
                            offsetLeft: rect.left,
                            offsetTop: rect.top,
                            pointers: [..._this._activePointers.values()],
                            activePointers: _this._activePointers
                        });
                        callback.call(sender, eventExt);
                    }
                });
                break;

            case "pointerdown":
                this.$el.addEventListener('pointerdown', function (event: PointerEvent) {
                    if (event.pointerType === "touch") {
                        _this._activePointers.set(event.pointerId, event);
                        const rect = this.getBoundingClientRect();
                        const eventExt: PointerEventExt = Object.assign(event, {
                            offsetLeft: rect.left,
                            offsetTop: rect.top,
                            pointers: [..._this._activePointers.values()],
                            activePointers: _this._activePointers
                        });
                        callback.call(sender, eventExt);
                    }
                });
                break;

            case "pointerup":
                this.$el.addEventListener('pointerup', function (event: PointerEvent) {
                    if (_this._activePointers.delete(event.pointerId)) {
                        const rect = this.getBoundingClientRect();
                        const eventExt: PointerEventExt = Object.assign(event, {
                            offsetLeft: rect.left,
                            offsetTop: rect.top,
                            pointers: [..._this._activePointers.values()],
                            activePointers: _this._activePointers
                        });
                        callback.call(sender, eventExt);
                    }
                });
                break;

            case "pointermove":
                this.$el.addEventListener('pointermove', function (event: PointerEvent) {
                    if (event.pointerType === "touch" && _this._activePointers.has(event.pointerId)) {
                        _this._activePointers.set(event.pointerId, event);
                        const rect = this.getBoundingClientRect();
                        const eventExt: PointerEventExt = Object.assign(event, {
                            offsetLeft: rect.left,
                            offsetTop: rect.top,
                            pointers: [..._this._activePointers.values()],
                            activePointers: _this._activePointers
                        });
                        callback.call(sender, eventExt);
                    }
                });
                break;
        }
    }
}

export {PointerHandler};

