import {createEvents, EventsHandler} from '../Events';
import {parseHTML, stringTemplate} from '../utils/shared';

export interface IViewParams {
    model?: any;
    template?: string;
    parent?: View<any> | null;
    classList?: string[];
}

export type ViewEventsList = ["render"];
const VIEW_EVENTS: ViewEventsList = ["render"];

class View<M> {

    static __counter__: number = 0;

    protected __id: number;

    public events: EventsHandler<ViewEventsList>;

    public model: M;

    public template: string;

    public parent: View<any> | null;

    public el: HTMLElement | null;

    protected _classList: string[];

    constructor(options: IViewParams = {}) {
        this.__id = View.__counter__++;
        this.events = createEvents<ViewEventsList>(VIEW_EVENTS);
        this.model = options.model || null;
        this.template = options.template || "";
        this.parent = options.parent || null;
        this._classList = options.classList || [];
        this.el = null;
    }

    static getHTML(template: string, params: any): string {
        return stringTemplate(template, params);
    }

    static parseHTML(htmlStr: string): HTMLElement[] {
        return parseHTML(htmlStr);
    }

    static insertAfter(newNodes: HTMLElement | HTMLElement[], referenceNode: Node): HTMLElement[] {
        if (!Array.isArray(newNodes)) {
            newNodes = [newNodes];
        }
        for (let i = 0; i < newNodes.length; i++) {
            if (referenceNode.parentNode) {
                referenceNode.parentNode.insertBefore(newNodes[i], referenceNode.nextSibling);
            }
        }
        return newNodes;
    }

    static insertBefore(newNodes: HTMLElement | HTMLElement[], referenceNode: Node): HTMLElement[] {
        if (!Array.isArray(newNodes)) {
            newNodes = [newNodes];
        }
        for (let i = 0; i < newNodes.length; i++) {
            if (referenceNode.parentNode) {
                referenceNode.parentNode.insertBefore(newNodes[i], referenceNode);
            }
        }
        return newNodes;
    }

    public insertBefore(view: View<any> | HTMLElement) {
        if (!this.el) {
            this.render();
        }
        if (this.el) {
            if (view instanceof HTMLElement && view.parentNode) {
                View.insertBefore(this.el, view);
            }
            if (view instanceof View && view.el && view.el.parentNode) {
                View.insertBefore(this.el, view.el);
            }
        }
    }

    public insertAfter(view: View<any> | HTMLElement) {
        if (!this.el) {
            this.render();
        }
        if (this.el) {
            if (view instanceof HTMLElement && view.parentNode) {
                View.insertAfter(this.el, view);
            }
            if (view instanceof View && view.el && view.el.parentNode) {
                View.insertAfter(this.el, view.el);
            }
        }
    }

    public isEqual(view: View<any>): boolean {
        return view.__id === this.__id;
    }

    public appendTo(node: HTMLElement, clean: boolean = false, firstPosition: boolean = false) {
        if (node) {
            if (!this.el) {
                this.beforeRender(node);
                this.render();
            }

            if (this.el && this.el.parentNode) {
                this.el.parentNode.removeChild(this.el);
            }

            if (clean) {
                node.innerHTML = "";
            }

            if (this.el) {
                if (firstPosition) {
                    if (node.childNodes[0]) {
                        View.insertBefore(this.el, node.childNodes[0]);
                    } else {
                        node.appendChild(this.el);
                    }
                } else {
                    node.appendChild(this.el);
                }
            }
            this.afterRender(node);
        }

        return this;
    }

    public afterRender(parentNode: HTMLElement) {
    }

    public beforeRender(parentNode: HTMLElement) {
    }

    public stopPropagation() {
        this.events.stopPropagation();
    }

    public renderTemplate(params: any): HTMLElement {
        return View.parseHTML(View.getHTML(this.template, params || {}))[0];
    }

    public render(params?: any): this {
        this.el = this.renderTemplate(params);
        for (let i = 0, len = this._classList.length; i < len; i++) {
            this.el.classList.add(this._classList[i]);
        }
        this.events.dispatch(this.events.render, this);
        return this;
    }

    public select<T extends HTMLElement>(queryStr: string): T | null {
        if (this.el) {
            return this.el.querySelector<T>(queryStr);
        }
        return null as T | null;
    }

    public selectRemove(queryStr: string): HTMLElement | undefined {
        if (this.el) {
            let r = this.select(queryStr);
            if (r && r.parentNode) {
                r.parentNode.removeChild(r);
                return r;
            }
        }
    }

    public selectAll(queryStr: string, callback?: Function) {
        if (this.el) {
            const res = this.el.querySelectorAll(queryStr);
            if (callback) {
                for (let i = 0, len = res.length; i < len; i++) {
                    callback(res[i], i);
                }
            }
            return res;
        }
    }

    public remove() {
        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
    }
}

export {View};
