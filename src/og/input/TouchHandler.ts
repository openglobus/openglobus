'use strict';

class TouchHandler {

    protected _htmlObject: HTMLElement;

    constructor(htmlObject: HTMLElement) {
        this._htmlObject = htmlObject;
    }

    public setEvent(event: string, sender: any, callback: Function) {
        switch (event) {
            case "touchcancel":
                this._htmlObject.addEventListener('touchcancel', function (event: any) {
                    event.preventDefault();
                    let rect = this.getBoundingClientRect();
                    event.offsetLeft = rect.left;
                    event.offsetTop = rect.top;
                    callback.call(sender, event);
                    event.preventDefault();
                });
                break;

            case "touchstart":
                this._htmlObject.addEventListener('touchstart', function (event: any) {
                    event.preventDefault();
                    let rect = this.getBoundingClientRect();
                    event.offsetLeft = rect.left;
                    event.offsetTop = rect.top;
                    callback.call(sender, event);
                    event.preventDefault();
                });
                break;

            case "touchend":
                this._htmlObject.addEventListener('touchend', function (event: any) {
                    event.preventDefault();
                    let rect = this.getBoundingClientRect();
                    event.offsetLeft = rect.left;
                    event.offsetTop = rect.top;
                    callback.call(sender, event);
                    event.preventDefault();
                });
                break;

            case "touchmove":
                this._htmlObject.addEventListener('touchmove', function (event: any) {
                    event.preventDefault();
                    let rect = this.getBoundingClientRect();
                    event.offsetLeft = rect.left;
                    event.offsetTop = rect.top;
                    callback.call(sender, event);
                    event.preventDefault();
                });
                break;
        }
    }
}

export {TouchHandler};

