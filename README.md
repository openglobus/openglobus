[![NPM PACKAGE](https://img.shields.io/npm/v/@openglobus/og.svg?logo=npm&logoColor=fff&label=NPM+package&color=limegreen)](https://www.npmjs.com/@openglobus/og)
![BUILD](https://github.com/openglobus/openglobus/actions/workflows/push.yml/badge.svg)

# Openglobus

English | [简体中文](README_CN.md) | [Portuguese-BR](README_pt-BR.md)

[Openglobus](http://www.openglobus.org/) is a typescript/javascript library designed to display interactive 3D maps at a
scale from planet to bee.
It supports various high-resolution terrain providers, imagery layers, renders thousands of 3D objects, provides
geometry measurement tools, and more. It uses the WebGL technology, open-source and
completely free.

Openglobus main goal is to make 3D map features fast, good looking, user friendly and easy to implement in any
related project.

**[Playground](https://jsfiddle.net/tbo47/27b8dsg1/)** **[Examples](https://openglobus.org/examples/)**

## Getting Start

### Installation

```sh
npm install @openglobus/og
# or
yarn add @openglobus/og
```

### Code: using umd lib

```html

<link rel="stylesheet" href="../lib/@openglogus/og.css">
<script src="../lib/@openglogus/og.umd.js"></script>
<div id="globus"></div>
<script>

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
        autoActivate: true,
        fontsSrc: "../res/fonts", // Fonts folder
        resourcesSrc: "../res",   // Night and water mask textures folder
        viewExtent: [5.56707, 45.15679, 5.88834, 45.22260]
    });

</script>
```

### Code: using esm lib

```html

<link rel="stylesheet" href="../lib/@openglobus/og.css">
<div id="globus"></div>
<script type="module">

    import {XYZ, Globe, GlobusTerrain} from '../lib/@openglobus/og.esm.js';

    const osm = new XYZ("OpenStreetMap", {
        isBaseLayer: true,
        url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        visibility: true,
    });

    const globus = new Globe({
        target: "globus", // a HTMLDivElement which its id is `globus`
        name: "Earth",
        terrain: new GlobusTerrain(),
        layers: [osm],
        autoActivate: true,
        fontsSrc: "../res/fonts",  // Fonts folder
        resourcesSrc: "../res",    // Night and water mask textures folder
        viewExtent: [5.56707, 45.15679, 5.88834, 45.22260]
    });

</script>
```

## Frameworks integrations

Openglobus integrates well with front-end frameworks like React, Angular or
Vuejs [Read more here](./framework-intergration.md).

## Documentation

UNDER CONSTRUCTION
Here is a [Wiki](https://github.com/openglobus/openglobus/wiki), also
check out the [hosted examples](http://www.openglobus.org/examples.html), and
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

Then, it will generate 5 files at `lib/@openglobus/`:

- og.umd.js
- og.umd.js.map
- og.esm.js
- og.esm.js.map
- og.css
- ./res/...

### Run examples

First, it starts by watching sources and building into ./lib folder esm module:

```sh
npm run dev
```

Second, runs local server, then you can browse 127.0.0.1:8080:

```sh
npm run serve
```

Third, try an example from the sandbox:

```sh
 http://127.0.0.1:8080/sandbox/osm/osm.html
```

### Other scripts

`npm run docs` - build [api documentation](https://www.openglobus.org/api/) into /api folder

`npm run serve` - run local web server for develop and watch examples

`npm run lint` - run code linter

`npm run test` - run tests

`tsc` - run typescript parser

## Support the Project

There are many ways to contribute back to the project:

- Help us test new and existing features and report [bugs](https://github.com/openglobus/openglobus/issues)
- Help answer questions on the community [forum](https://groups.google.com/d/forum/openglobus)
  and [chat](https://gitter.im/openglobus/og)
- ⭐️ us on GitHub
- Spread the word about openglobus on [social media](https://twitter.com/openglobus)
- Become a contributor
- [Support with money](https://opencollective.com/openglobusjs)

## License

### MIT
