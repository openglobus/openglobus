/* eslint-disable no-param-reassign */
'use strict';

import { htmlColorToFloat32Array } from './utils/shared.js';
import { Vec3 } from './math/Vec3.js';
import { MIN, MAX } from './math.js';

function getColor(color) {
    if (color instanceof Array) {
        return color;
    } else if (typeof color === 'string') {
        return htmlColorToFloat32Array(color);
    }
    return [1.0, 1.0, 1.0, 1.0];
}

class Object3d {
    constructor(data) {

        this._name = data.name || "noname";
        this._vertices = data.vertices || [];
        this._numVertices = this._vertices.length / 3;
        this._texCoords = data.texCoords || new Array(2 * this._numVertices);

        if (data.center) {
            Object3d.centering(this._vertices);
        }

        /**
         * Image src.
         * @protected
         * @type {string}
         */
        this._src = data.src || null;

        this.color = getColor(data.color);

        if (data.scale) {
            Object3d.scale(this._vertices, data.scale);
        }

        if (data.indexes) {
            this._indexes = data.indexes || [];
            this._normals = data.normals || [];
        } else {
            this._normals = Object3d.getNormals(this._vertices);
            this._indexes = new Array(this._vertices.length);
            for (let i = 0, len = this._indexes.length; i < len; i++) {
                this._indexes[i] = i;
            }
        }
    }

    static centering(verts) {
        let min_x = MAX, min_y = MAX, min_z = MAX, max_x = MIN, max_y = MIN, max_z = MIN;
        for (let i = 0, len = verts.length; i < len; i += 3) {
            let x = verts[i], y = verts[i + 1], z = verts[i + 2];
            if (x < min_x) min_x = x;
            if (y < min_y) min_y = y;
            if (z < min_z) min_z = z;
            if (x > max_x) max_x = x;
            if (y > max_y) max_y = y;
            if (z > max_z) max_z = z;
        }

        let c_x = min_x + (max_x - min_x) * 0.5;
        let c_y = min_y + (max_y - min_y) * 0.5;
        let c_z = min_z + (max_z - min_z) * 0.5;

        for (let i = 0, len = verts.length; i < len; i += 3) {
            verts[i] -= c_x;
            verts[i + 1] -= c_y;
            verts[i + 2] -= c_z;
        }
    }

    get src() {
        return this._src;
    }

    get name() {
        return this._name;
    }

    get vertices() {
        return this._vertices;
    }

    get normals() {
        return this._normals;
    }

    get indexes() {
        return this._indexes;
    }

    get texCoords() {
        return this._texCoords;
    }

    get numVertices() {
        return this._numVertices;
    }

    static scale(vertices, s) {
        for (let i = 0; i < vertices.length; i++) {
            vertices[i] *= s;
        }
    }

    static centroid(vertices) {
        let minX = 1000.0, minY = 1000.0, minZ = 1000.0, maxX = -1000.0, maxY = -1000.0, maxZ = -1000.0;

        for (let i = 0; i < vertices.length; i += 3) {
            let x = vertices[i], y = vertices[i + 1], z = vertices[i + 2];
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (z < minZ) minZ = z;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            if (z > maxZ) maxZ = z;
        }

        return [minX + (maxX - minX) * 0.5, minY + (maxY - minY) * 0.5, minZ + (maxZ - minZ) * 0.5];
    }

    static translate(vertices, v) {
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i] -= v[0];
            vertices[i + 1] -= v[1];
            vertices[i + 2] -= v[2];
        }
    }

    static getNormals(vertices) {
        let res = new Array(vertices.length);

        for (var i = 0; i < vertices.length; i += 9) {

            let t03 = i, t13 = i + 3, t23 = i + 6, v0_x = vertices[t03], v0_y = vertices[t03 + 1],
                v0_z = vertices[t03 + 2], v1_x = vertices[t13], v1_y = vertices[t13 + 1], v1_z = vertices[t13 + 2],
                v2_x = vertices[t23], v2_y = vertices[t23 + 1], v2_z = vertices[t23 + 2], vv0_x = v1_x - v0_x,
                vv0_y = v1_y - v0_y, vv0_z = v1_z - v0_z, vv1_x = v2_x - v0_x, vv1_y = v2_y - v0_y, vv1_z = v2_z - v0_z,
                n_x = vv0_y * vv1_z - vv0_z * vv1_y, n_y = vv0_z * vv1_x - vv0_x * vv1_z,
                n_z = vv0_x * vv1_y - vv0_y * vv1_x;

            let l = Math.sqrt(n_x * n_x + n_y * n_y + n_z * n_z);

            n_x /= l;
            n_y /= l;
            n_z /= l;

            res[t03] = n_x;
            res[t03 + 1] = n_y;
            res[t03 + 2] = n_z;

            res[t13] = n_x;
            res[t13 + 1] = n_y;
            res[t13 + 2] = n_z;

            res[t23] = n_x;
            res[t23 + 1] = n_y;
            res[t23 + 2] = n_z;
        }

        return res;
    }

    static createSphere(lonBands = 16, latBands = 16, radius = 1.0, offsetX = 0, offsetY = 0, offsetZ = 0) {

        let vertices = [], indexes = [], normals = [];

        for (let latNumber = 0; latNumber <= latBands; latNumber++) {
            var theta = latNumber * Math.PI / latBands;
            var sinTheta = Math.sin(theta);
            var cosTheta = Math.cos(theta);

            for (let longNumber = 0; longNumber <= lonBands; longNumber++) {
                var phi = longNumber * 2 * Math.PI / lonBands;
                var sinPhi = Math.sin(phi);
                var cosPhi = Math.cos(phi);
                var x = cosPhi * sinTheta + offsetX;
                var y = cosTheta + offsetY;
                var z = sinPhi * sinTheta + offsetZ;
                //var u = 1 - (longNumber / lonBands);
                //var v = latNumber / latBands;
                normals.push(x);
                normals.push(y);
                normals.push(z);
                //texCoords.push(u);
                //texCoords.push(v);
                vertices.push(radius * x);
                vertices.push(radius * y);
                vertices.push(radius * z);
            }
        }

        for (let latNumber = 0; latNumber < latBands; latNumber++) {
            for (let longNumber = 0; longNumber < lonBands; longNumber++) {
                var first = (latNumber * (lonBands + 1)) + longNumber;
                var second = first + lonBands + 1;

                indexes.push(first);
                indexes.push(first + 1);
                indexes.push(second);

                indexes.push(second);
                indexes.push(first + 1);
                indexes.push(second + 1);
            }
        }

        return new Object3d({
            'vertices': vertices, 'normals': normals, 'indexes': indexes
        });
    }

    static createDisc(radius = 1.0, height = 0.0, radialSegments = 8, isTop = true, startIndex = 0, offsetX = 0, offsetY, offsetZ = 0) {

        let vertices = [], indexes = [], normals = [];

        let thetaStart = 0.0, thetaLength = Math.PI * 2;

        let sign = (isTop === true) ? 1.0 : -1.0;

        let centerIndexStart = startIndex;

        for (let x = 1; x <= radialSegments; x++) {
            vertices.push(0 + offsetX, height * sign + offsetY, 0 + offsetZ);
            normals.push(0, sign, 0);
            //texCoords.push(0.5, 0.5);
            startIndex++;
        }

        let centerIndexEnd = startIndex;

        for (let x = 0; x <= radialSegments; x++) {

            let u = x / radialSegments;
            let theta = u * thetaLength + thetaStart;

            let cosTheta = Math.cos(theta);
            let sinTheta = Math.sin(theta);

            vertices.push(radius * sinTheta + offsetX, height * sign + offsetY, radius * cosTheta + offsetZ);
            normals.push(0, sign, 0);
            //texCoords.push((cosTheta * 0.5) + 0.5, (sinTheta * 0.5 * sign) + 0.5);

            startIndex++;
        }

        for (let x = 0; x < radialSegments; x++) {
            let c = centerIndexStart + x, i = centerIndexEnd + x;
            if (isTop === true) {
                indexes.push(i, i + 1, c);
            } else {
                indexes.push(i + 1, i, c);
            }
        }

        return new Object3d({
            'vertices': vertices, 'normals': normals, 'indexes': indexes
        });
    }

    static createCylinder(radiusTop = 1.0, radiusBottom = 1.0, height = 1.0, radialSegments = 32, heightSegments = 1.0, isTop = true, isBottom = true, offsetX = 0, offsetY = 0, offsetZ = 0) {

        let vertices = [], indexes = [], normals = [];

        let thetaStart = 0.0, thetaLength = Math.PI * 2;

        let index = 0;
        let indexArray = [];

        let normal = new Vec3();

        var slope = (radiusBottom - radiusTop) / height;

        for (let y = 0; y <= heightSegments; y++) {

            let indexRow = [];

            let v = y / heightSegments;

            let radius = v * (radiusBottom - radiusTop) + radiusTop;

            for (let x = 0; x <= radialSegments; x++) {

                let u = x / radialSegments;

                let theta = u * thetaLength + thetaStart;

                let sinTheta = Math.sin(theta), cosTheta = Math.cos(theta);

                vertices.push(radius * sinTheta + offsetX, -v * height + height + offsetY, radius * cosTheta + offsetZ);

                normal.set(sinTheta, slope, cosTheta).normalize();
                normals.push(normal.x, normal.y, normal.z);

                //texCoords.push(u, 1 - v);

                indexRow.push(index++);
            }
            indexArray.push(indexRow);
        }

        for (let x = 0; x < radialSegments; x++) {
            for (let y = 0; y < heightSegments; y++) {

                let a = indexArray[y][x], b = indexArray[y + 1][x], c = indexArray[y + 1][x + 1],
                    d = indexArray[y][x + 1];

                indexes.push(a, b, d);
                indexes.push(b, c, d);
            }
        }

        if (radiusTop !== 0.0 && isTop) {
            let cap = Object3d.createDisc(radiusTop, height, radialSegments, true, index, offsetX, offsetY, offsetZ);
            vertices.push(...cap.vertices);
            normals.push(...cap.normals);
            indexes.push(...cap.indexes);
        }

        if (radiusBottom !== 0.0 && isBottom) {
            let cap = Object3d.createDisc(radiusBottom, 0, radialSegments, false, index + (isTop ? (1 + 2 * radialSegments) : 0), offsetX, offsetY, offsetZ);
            vertices.push(...cap.vertices);
            normals.push(...cap.normals);
            indexes.push(...cap.indexes);
        }

        return new Object3d({
            'vertices': vertices, 'normals': normals, 'indexes': indexes
        });
    }

    static createCube(length = 1, height = 1, depth = 1, xOffset = 0, yOffset = 0, zOffset = 0) {
        let l = length * 0.5 + xOffset, h = height * 0.5 + yOffset, d = depth * 0.5 + zOffset;

        return new Object3d({
            vertices: [//bottom
                -l, -h, d, l, -h, -d, l, -h, d, -l, -h, d, -l, -h, -d, l, -h, -d,

                //top
                -l, h, d, l, h, d, l, h, -d, -l, h, d, l, h, -d, -l, h, -d,

                //front
                -l, -h, d, l, -h, d, -l, h, d, -l, h, d, l, -h, d, l, h, d,

                //back
                -l, -h, -d, -l, h, -d, l, -h, -d, -l, h, -d, l, h, -d, l, -h, -d,

                //left
                l, -h, d, l, -h, -d, l, h, d, l, h, d, l, -h, -d, l, h, -d,

                //right
                -l, -h, d, -l, h, d, -l, -h, -d, -l, h, d, -l, h, -d, -l, -h, -d]
        });
    }

    static createArrow(back = 0.0, height = 2.1, front = -15) {
        return new Object3d({
            vertices: [0, height, 0, 7, 0, 6, 0, 0, front,

                0, 0, back, 7, 0, 6, 0, height, 0,

                -7, 0, 6, 0, 0, back, 0, height, 0,

                -7, 0, 6, 0, height, 0, 0, 0, front,

                -7, 0, 6, 0, 0, front, 0, 0, back, 0, 0, back, 0, 0, front, 7, 0, 6]
        });
    }
}

export { Object3d };