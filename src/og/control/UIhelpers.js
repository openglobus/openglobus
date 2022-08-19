'use strict';

export function elementFactory(type, attributes, ...children) {
    const el = document.createElement(type)
    let key = null;
    for (key in attributes) {
        el.setAttribute(key, attributes[key])
    }

    children.forEach(child => {
        if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child))
        } else {
            el.appendChild(child)
        }
    })

    return el
}

export function getAllnodes(CSSclass) { return document.querySelectorAll(CSSclass) };
export function nodesToArray(nodeList) { return Array.from(nodeList) };
export function setAllCSSclass(CSSclass, nodeArray) { return nodeArray.forEach(x => x.classList.add(CSSclass)) };

export function allMenuBtnOFF() {
    setAllCSSclass('OFF', nodesToArray(getAllnodes('.menu-btn')));
}

export function allDialogsHide() {
    setAllCSSclass('hide', nodesToArray(getAllnodes('.dialog')));
}

export function btnClickHandler(btn_id, dialog_id, dialog_selector, btn_icon_id) {
    let btn = document.getElementById(btn_id);
    let dialog = document.getElementById(dialog_id);
    btn.onclick = function (e) {
        if (this.classList.contains('OFF')) {
            // Turn to ON
            allMenuBtnOFF();
            allDialogsHide();
            this.classList.remove('OFF');
            if(dialog){dialog.classList.remove('hide')};

            if (this.classList.contains('has-dialog')) {
                let listener = document.addEventListener('click', e => {
                    if (e.target.matches(dialog_selector) || e.target.matches(btn_icon_id)) { //inside
                        return;
                    } else {//outside    
                        btn.classList.add('OFF');
                        if(dialog){dialog.classList.add('hide')};
                        this.removeEventListener('click', arguments.callee); // TODO needs fix
                    }
                })
            }
        } else {
            // Turn to OFF
            this.classList.add('OFF');
            dialog.classList.add('hide');
        }
    }
}
