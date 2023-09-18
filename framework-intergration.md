## Frameworks integrations

```sh
npm install @openglobus/og --save
# or
yarn add @openglobus/og
```

### Code: using reactjs

[example](https://github.com/tbo47/openglobus_grafana)

### Code: using in Angular

```javascript
import { Component, OnInit } from '@angular/core';
import * as og from '@openglobus/og';

@Component({
  template: '<div id="globus" style="width:100%;height:100%"></div>'
})
export class GlobeComponent implements OnInit {

  constructor() { }

  ngOnInit() {
    const osm = new og.layer.XYZ('OpenStreetMap', {
      isBaseLayer: true,
      url: '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      visibility: true,
    });
    const globus = new og.Globe({
      target: 'globus', // a HTMLDivElement which its id is `globus`
      name: 'Earth',
      terrain: new og.terrain.GlobusTerrain(),
      layers: [osm],
      autoActivate: true
    });
    globus.planet.flyLonLat(new og.LonLat(2, 48, 20108312));
  }

}
```

Note: tsconfig.json `compilerOptions>strict` need to be `false`

Note: You will need to import the css in angular.json
```
"styles": [
  "node_modules/@openglobus/og/css/og.css",
  ...
],
```

### Code: using in VueJs 


```javascript
<template>
  <div id="globus" style="width: 100%; height: 100%"></div>
</template>
<script>
import * as og from "@openglobus/og";

export default {
  name: "openglobus",
  mounted() {
    const osm = new og.layer.XYZ("OpenStreetMap", {
      isBaseLayer: true,
      url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      visibility: true,
    });
    const globus = new og.Globe({
      target: "globus", // a HTMLDivElement which its id is `globus`
      name: "Earth",
      terrain: new og.terrain.GlobusTerrain(),
      layers: [osm],
      autoActivate: true
    });
    globus.planet.flyLonLat(new og.LonLat(2, 48, 20108312));
  }
};
</script>
```
