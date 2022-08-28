'use strict';


/* 
* Helper functions for UI/UX
*/



// Creates new DOM elements and assigns attributes
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


export function getAllnodes(CSSclass) { return document.querySelectorAll(CSSclass) }; // Get all nodes of a class

export function nodesToArray(nodeList) { return Array.from(nodeList) }; // Convert nodelist to an Array

export function setAllCSSclass(CSSclass, nodeArray) { return nodeArray.forEach(x => x.classList.add(CSSclass)) }; // Adds a class to all elements selected


// Sets all menu buttons to off
export function allMenuBtnOFF() {
    setAllCSSclass('og-OFF', nodesToArray(getAllnodes('.og-menu-btn')));
}

// Hides all dialoges of main menu
export function allDialogsHide() {
    setAllCSSclass('og-hide', nodesToArray(getAllnodes('.og-dialog')));
}


// Handles the click inside/outside a dialog - closes dialog when click outside
export function btnClickHandler(btn_id, dialog_id, dialog_selector, btn_icon_id) {
    let btn = document.getElementById(btn_id);
    let dialog = document.getElementById(dialog_id);
    btn.onclick = function (e) {
        if (this.classList.contains('og-OFF')) {
            // Turn to ON
            allMenuBtnOFF();
            allDialogsHide();
            this.classList.remove('og-OFF');
            if(dialog){dialog.classList.remove('og-hide')};

            if (this.classList.contains('og-has-dialog')) {
                let listener = document.addEventListener('click', (e) => {
                    if (e.target.matches(dialog_selector) || e.target.matches(btn_icon_id)) { //inside
                        return;
                    } else {//outside    
                        btn.classList.add('og-OFF');
                        if(dialog){dialog.classList.add('og-hide')};
                        // this.removeEventListener('click', arguments.callee); // TODO needs fix
                    }
                })
            }
        } else {
            // Turn to OFF
            this.classList.add('og-OFF');
            if(dialog){dialog.classList.add('og-hide')};
        }
    }
}
