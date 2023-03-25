[![NPM PACKAGE](https://img.shields.io/npm/v/@openglobus/og.svg?logo=npm&logoColor=fff&label=NPM+package&color=limegreen)](https://www.npmjs.com/@openglobus/og)

# Openglobus

English | [简体中文](README_CN.md) | [Portuguese-BR](README_pt-BR.md)

[Openglobus](http://www.openglobus.org/) is a javascript library designed to display interactive 3d maps and planets
with map tiles, imagery and vector data, markers and 3d objects. It uses the WebGL technology, open source and
completely free.

Openglobus main goal is to make 3d map features fast, good lookin, user friendly and easy to implement in any
related project.

## Getting Start

### Installation

```sh
npm install @openglobus/og
# or
yarn add @openglobus/og
```

### Code: using umd lib

```html
<link rel="stylesheet" href="./libs/og.css">
<script src="./libs/og.umd.js"></script>
<div id="globus"></div>
<script>

  const osm = new og.layer.XYZ("OpenStreetMap", {
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
  })

  const globus = new og.Globe({
    target: "globus", // a HTMLDivElement which its id is `globus`
    name: "Earth",
    terrain: new og.terrain.GlobusTerrain(),
    layers: [osm],
    autoActivated: true,
    viewExtent: [5.56707, 45.15679, 5.88834, 45.22260]
  })

</script>
```

### Code: using esm lib

``` html
<link rel="stylesheet" href="./libs/og.css">
<div id="globus"></div>
<script type="module">

  import { layer, Globe, terrain } from './libs/og.esm.js'
  const { XYZ } = layer
  const { GlobusTerrain } = terrain

  const osm = new XYZ("OpenStreetMap", {
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
  })

  const globus = new Globe({
    target: "globus", // a HTMLDivElement which its id is `globus`
    name: "Earth",
    terrain: new GlobusTerrain(),
    layers: [osm],
    autoActivated: true,
    viewExtent: [5.56707, 45.15679, 5.88834, 45.22260]
  })

</script>
```

## Frameworks integrations

Openglobus integrates well with front-end frameworks like React, Angular or Vuejs [Read more here](./framework-intergration.md).

## Documentation

Check out the [hosted examples](http://www.openglobus.org/examples.html), or
the [API documentation](http://www.openglobus.org/api/).

## Get Started to contribute

### Development

1. Clone repository.
2. Run in the repo folder:

```sh
npm install
# if you use yarn, you can run `yarn`
yarn
```

### Build Library

Run

```sh
npm run build
```

Then, it will generate 5 files at `dist/@openglobus/`:

- og.umd.js
- og.umd.js.map
- og.esm.js
- og.esm.js.map
- og.css

All JavaScript files are compressed by `terser` plugin.

### Other scripts

`npm run core` - build og.core (rendering engine) stand-alone

`npm run webgl` - build og.webgl (webgl wrap) stand-alone

`npm run api` - build [api documentation](https://www.openglobus.org/api/) into /api folder

`npm run serve` - run local web server for develop and watch examples

`npm run font` - generate custom font atlas

## Support the Project

There are many ways to contribute back to the project:

- Help us test new and existing features and report [bugs](https://github.com/openglobus/openglobus/issues)
- Help answer questions on the community [forum](https://groups.google.com/d/forum/openglobus)
  and [chat](https://gitter.im/openglobus/og)
- ⭐️ us on GitHub
- Spread the word about openglobus on [social media](https://twitter.com/openglobus)
- Become a contributor

## License

### MIT
