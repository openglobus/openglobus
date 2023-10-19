[![NPM PACKAGE](https://img.shields.io/npm/v/@openglobus/og.svg?logo=npm&logoColor=fff&label=NPM+package&color=limegreen)](https://www.npmjs.com/@openglobus/og)
![BUILD](https://github.com/openglobus/openglobus/actions/workflows/push.yml/badge.svg)
# Openglobus

[English](README.md) | [简体中文](README_CN.md) | Portuguese-BR

[Openglobus](http://www.openglobus.org/) é uma biblioteca projetada para dispor um mapa 3D para planetas
por meio de "tiles maps" (mapa ou imagens em ladrilho), imagens e dados em vetores, marcadores e objeto 3D. Usando tecnologia WebGL , de código aberto e completamente livre.

O principal objetivo do Openglobus é proporcionar um mapa 3D leve e rápido, com boa aparencia, de interface amigável e fácil implementação para qualquer projeto.

## Começando

### Instalação

```sh
npm install @openglobus/og
# or
yarn add @openglobus/og
```

### Código: usando umd lib

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
        fontsSrc: "../lib/@openglobus/res/fonts", // Fonts folder
        resourcesSrc: "../lib/@openglobus/res",   // Night and water mask textures folder
        viewExtent: [5.56707, 45.15679, 5.88834, 45.22260]
    });

</script>
```

### Código: usando esm lib

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
        fontsSrc: "../res/fonts",  // Fonts folder
        resourcesSrc: "../res",    // Night and water mask textures folder
        viewExtent: [5.56707, 45.15679, 5.88834, 45.22260]
    });

</script>
```

## Integrações de Frameworks 

Openglobus se integra bem com frameworks como React, Angular ou Vuejs [Read more here](./framework-intergration.md).

## Documentação

UNDER CONSTRUCTION
Here is a [Wiki](https://github.com/openglobus/openglobus/wiki), also
check out the [hosted examples](http://www.openglobus.org/examples.html), and
the [API documentation](http://www.openglobus.org/api/).

## Comece a contribuir

### Desenvolvimento

1. Clone repository.
2. Run in the repo folder:

```sh
npm install
# if you use yarn, you can run `yarn`
yarn
```

### Construindo Bibliotecas

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

### Outros scripts

`npm run docs` - build [documentation](https://www.openglobus.org/api/) into /api folder

`npm run serve` - run local web server for develop and watch examples

`npm run lint` - run code linter

`npm run test` - run tests

`tsc` - run typescript parser


## Ajude o projeto

Há varias maneiras de contribuir com o projeto:

- Ajudando a testar e reportando problemas [bugs](https://github.com/openglobus/openglobus/issues)
- Ajudando a fazer perguntas [forum](https://groups.google.com/d/forum/openglobus)
  e [chat](https://gitter.im/openglobus/og)
- ⭐️ Estamos no Github
- Espalhe coisas sobre o openglobus no [social media](https://twitter.com/openglobus)
- Se torne um contribuidor

## Licença

MIT
=======
