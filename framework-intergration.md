## Frameworks integrations

### Code: using in Angular

```javascript
import { Component, OnInit } from '@angular/core';
import { Globe, layer, terrain, LonLat } from '@openglobus/og';

@Component({
  template: '<div id="globus" style="width:100%;height:100%"></div>'
})
export class GlobeComponent implements OnInit {

  constructor() { }

  ngOnInit() {

    const { XYZ } = layer;
    const { GlobusTerrain } = terrain;

    const osm = new XYZ('OpenStreetMap', {
      isBaseLayer: true,
      url: '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      visibility: true,
    });

    const globus = new Globe({
      target: 'globus', // a HTMLDivElement which its id is `globus`
      name: 'Earth',
      terrain: new GlobusTerrain(),
      layers: [osm],
      autoActivated: true
    });
    globus.planet.flyLonLat(new LonLat(2, 48, 20108312));
  }

}
```

### Code: using in VueJs 


```javascript
<template>
  <div id="globus" style="width: 100%; height: 100%"></div>
</template>
<script>
import { Globe, layer, terrain, LonLat } from "@openglobus/og";

export default {
  name: "openglobus",
  mounted() {
    const { XYZ } = layer;
    const { GlobusTerrain } = terrain;

    const osm = new XYZ("OpenStreetMap", {
      isBaseLayer: true,
      url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      visibility: true
    });

    const globus = new Globe({
      target: "globus", // a HTMLDivElement which its id is `globus`
      name: "Earth",
      terrain: new GlobusTerrain(),
      layers: [osm],
      autoActivated: true
    });
    globus.planet.flyLonLat(new LonLat(2, 48, 20108312));
  }
};
</script>
```
