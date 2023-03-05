'use strict';


import { stringTemplate } from '../utils/shared.js';
import { parseHTML } from "../utils/shared.js";
import { Events } from '../Events.js';

class View {
    constructor(options = {}) {
        this.__id = View.__staticCounter++;
        this._events = new Events(options.eventList || []);
        this.model = options.model || null;
        this.template = options.template || "";
        this.parent = options.parent || null;
        this._classList = options.classList || [];
    }

    static set __staticCounter(n) {
        this.__counter__ = n;
    }

    static get __staticCounter() {
        if (!this.__counter__ && this.__counter__ !== 0) {
            this.__counter__ = 0;
        }
        return this.__counter__;
    }

    static getHTML(template, params) {
        return stringTemplate(template, params);
    }

    static parseHTML(htmlStr) {
        return parseHTML(htmlStr);
    }

    static insertAfter(newNodes, referenceNode) {
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

    static insertBefore(newNodes, referenceNode) {
        if (!Array.isArray(newNodes)) {
            newNodes = [newNodes];
        }
        for (let i = 0; i < newNodes.length; i++) {
            if (referenceNode.parentNode) {
                referenceNode.parentNode.insertBefore(newNodes[i], referenceNode);
            }
        }
    }

    get events() {
        return this._events;
    }

    on(eventName, callback, sender) {
        return this._events.on(eventName, callback, sender);
    }

    off(eventName, callback) {
        return this._events.off(eventName, callback);
    }

    insertBefore(view) {
        if (!this.el) {
            this.render();
        }
        if (this.el) {
            if (view instanceof HTMLElement && view.parentNode) {
                View.insertBefore(this.el, view);
            }
            if (view instanceof View && view.el.parentNode) {
                View.insertBefore(this.el, view.el);
            }
        }
    }

    insertAfter(view) {
        if (!this.el) {
            this.render();
        }
        if (this.el) {
            if (view instanceof HTMLElement && view.parentNode) {
                View.insertAfter(this.el, view);
            }
            if (view instanceof View && view.el.parentNode) {
                View.insertAfter(this.el, view.el);
            }
        }
    }

    isEqual(view) {
        return view.__id === this.__id;
    }

    appendTo(node, clean, firstPosition) {
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

            if (firstPosition) {
                if (node.childNodes[0]) {
                    View.insertBefore(this.el, node.childNodes[0]);
                } else {
                    node.appendChild(this.el);
                }
            } else {
                node.appendChild(this.el);
            }
            this.afterRender(node);
        }

        return this;
    }

    afterRender(parentNode) {
        //virtual
    }

    beforeRender(parentNode) {
        //virtual
    }

    stopPropagation() {
        this._events.stopPropagation();
    }

    renderTemplate(params) {
        return View.parseHTML(View.getHTML(this.template, params || {}))[0];
    }

    render(params) {
        this.el = this.renderTemplate(params);
        for (let i = 0, len = this._classList.length; i < len; i++) {
            this.el.classList.add(this._classList[i]);
        }
        return this;
    }

    select(queryStr) {
        return this.el.querySelector(queryStr);
    }

    selectRemove(queryStr) {
        if (this.el) {
            let r = this.select(queryStr);
            if (r && r.parentNode) {
                r.parentNode.removeChild(r);
                return r;
            }
        }
    }

    selectAll(queryStr, callback) {
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

    remove() {
        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
    }
}

export { View };
