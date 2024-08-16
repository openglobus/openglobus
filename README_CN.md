[![NPM PACKAGE](https://img.shields.io/npm/v/@openglobus/og.svg?logo=npm&logoColor=fff&label=NPM+package&color=limegreen)](https://www.npmjs.com/@openglobus/og)
![BUILD](https://github.com/openglobus/openglobus/actions/workflows/push.yml/badge.svg)
# OpenGlobus

[English](README.md) | 简体中文 | [Portuguese-BR](README_pt-BR.md)

[openglobus](http://www.openglobus.org/) 是一个用于展示带有地图瓦片、影像、矢量数据、标注、三维物体的交互式三维地图（地球）的 JavaScript 库。它基于 WebGL 技术，开源且免费。

这个库的主要目标是令三维地图的功能迅速且美观地展示，并且对用户友好，易于在相关的项目中实施。

## 起步

### 安装

```sh
npm install @openglobus/og
# 或者
yarn add @openglobus/og
```

### 代码：使用 umd 引用

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

### 代码：使用 esm 引用

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

## 文档

UNDER CONSTRUCTION
Here is a [Wiki](https://github.com/openglobus/openglobus/wiki), also
check out the [hosted examples](https://sandbox.openglobus.org), and
the [API documentation](http://www.openglobus.org/api/).

## 如何贡献你的代码

### 开发

1. 将官方仓库 Clone 到本机
2. 使用 `npm` 或 `yarn` 安装依赖

``` sh
npm install
# 或
yarn
```

### 打包代码

运行命令

``` sh
npm run build
```

随后会在 `lib/@openglobus/` 目录下生成下列 5 个文件：

- og.umd.js
- og.umd.js.map
- og.esm.js
- og.esm.js.map
- og.css
- ./res/...

### 新情况

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

### 其他命令

`npm run docs` - 本地构建 API 帮助文档至 `/api` 目录

`npm run serve` - 运行本地 Web 服务器以便开发以及查看示例代码

`npm run lint` - run code linter

`npm run test` - run tests

`tsc` - run typescript parser


## 支持此项目

有多种方式来贡献此项目：

- 帮助我们测试新的或现有的功能，并[提交 bug](https://github.com/openglobus/openglobus/issues)
- 帮助我们在[谷歌 openglobus 社区](https://github.com/openglobus/openglobus/discussions)回答问题以及在 Gitter 上[交流](https://gitter.im/openglobus/og)
- 为 GitHub 上的仓库打个 ⭐
- 在社交媒体上传播 openglobus，推特：[点我](https://twitter.com/openglobus)
- 成为一名贡献者



## 开源许可

### MIT
