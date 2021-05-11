## Before show example

Before show this example install all dependencies and build example:
```shall
npm install
npm run build

```

## Installation

For installation **openglobus** as npm package run 

```shall
npm install @openglobus/og
```

##Usage
After installing, you can import components of globus in the following way (full example of usage in `./index.js`):
webpack > 5 (use exports from package.json)
```javascript
import { Globe, Entity } from '@openglobus/og';
import { GlobusTerrain } from '@openglobus/og/terrain';
import { XYZ, Vector } from '@openglobus/og/layer';
```
webpack < 5 (from common globus namespace):
```javascript
import { Globe, Entity, terrain, layer } from '@openglobus/og';
//...
const layer = new layer.XYZ();
//...
const layer = new terrrain.GlobusTerrain();

```

And don't forget link styles! (`index.html`)

```html
<style>
    @import './node_modules/@openglobus/og/css/og.css';
</style>
```