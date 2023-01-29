'use strict'

import { View } from './View.js';

class Dialog extends View {
    constructor(options) {
        super(options);
    }

    render(params) {
        super.render(params);
        return this;
    }
}

export { Dialog }