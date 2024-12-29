import {htmlColorToFloat32Array, TypedArray} from './utils/shared';
import {NumberArray3, Vec3} from './math/Vec3';
import {DEGREES, DEGREES_DOUBLE, MAX, MIN, RADIANS_HALF} from './math';
import {Mat4} from "./math/Mat4";
import {IObjGeometry, Obj} from "./utils/objParser";

function getColor(color?: number[] | TypedArray | string): Float32Array {
    if (color instanceof Array) {
        return new Float32Array(color);
    } else if (typeof color === 'string') {
        return htmlColorToFloat32Array(color);
    }
    return new Float32Array([1.0, 1.0, 1.0, 1.0]);
}

function getColor3v(color?: NumberArray3 | TypedArray | string): Float32Array {
    let res = new Float32Array([1.0, 1.0, 1.0]);
    if (color instanceof Array) {
        res[0] = color[0];
        res[1] = color[1];
        res[2] = color[2];
    } else if (typeof color === 'string') {
        let c = htmlColorToFloat32Array(color);
        res[0] = c[0];
        res[1] = c[1];
        res[2] = c[2];
    }
    return res;
}

interface IObject3dParams {
    name?: string;
    vertices?: number[];
    texCoords?: number[];
    indices?: number[];
    normals?: number[];
    center?: boolean;
    color?: number[] | TypedArray | string;
    scale?: number | Vec3;
    ambient?: string | NumberArray3;
    diffuse?: string | NumberArray3;
    specular?: string | NumberArray3;
    shininess?: number;
    colorTexture?: string;
    normalTexture?: string;
    metallicRoughnessTexture?: string;
}

class Object3d {

    protected _name: string;
    protected _vertices: number[];
    protected _numVertices: number;
    protected _texCoords: number[];

    protected _indices: number[];
    protected _normals: number[];

    public color: Float32Array;
    public ambient: Float32Array;
    public diffuse: Float32Array;
    public specular: Float32Array;
    public shininess: number;
    public colorTexture: string;
    public normalTexture: string;
    public metallicRoughnessTexture: string;
    public center: Vec3;

    constructor(data: IObject3dParams = {}) {

        this._name = data.name || "noname";
        this._vertices = data.vertices || [];
        this._numVertices = this._vertices.length / 3;
        this._texCoords = data.texCoords || new Array(2 * this._numVertices);

        if (data.center) {
            Object3d.centering(this._vertices);
        }

        this.center = Object3d.getCenter(this._vertices);

        this.color = getColor(data.color);
        this.ambient = getColor3v(data.ambient);
        this.diffuse = getColor3v(data.diffuse);
        this.specular = getColor3v(data.specular);
        this.shininess = data.shininess || 100;
        this.colorTexture = data.colorTexture || "";
        this.normalTexture = data.normalTexture || "";
        this.metallicRoughnessTexture = data.metallicRoughnessTexture || "";

        if (data.scale) {
            let s = data.scale;
            let scale: Vec3;
            if (typeof s === 'number') {
                scale = new Vec3(s, s, s);
            } else {
                scale = s;
            }
            Object3d.scale(this._vertices, scale);
        }

        if (data.indices) {
            this._indices = data.indices;
            this._normals = data.normals || [];
        } else {
            this._normals = data.normals || Object3d.getNormals(this._vertices);
            this._indices = new Array(this._vertices.length / 3);
            for (let i = 0, len = this._indices.length; i < len; i++) {
                this._indices[i] = i;
            }
        }
    }

    static getCenter(verts: number[]): Vec3 {

        let min_x = MAX, min_y = MAX, min_z = MAX,
            max_x = MIN, max_y = MIN, max_z = MIN;

        for (let i = 0, len = verts.length; i < len; i += 3) {
            let x = verts[i], y = verts[i + 1], z = verts[i + 2];
            if (x < min_x) min_x = x;
            if (y < min_y) min_y = y;
            if (z < min_z) min_z = z;
            if (x > max_x) max_x = x;
            if (y > max_y) max_y = y;
            if (z > max_z) max_z = z;
        }

        return new Vec3(
            min_x + (max_x - min_x) * 0.5,
            min_y + (max_y - min_y) * 0.5,
            min_z + (max_z - min_z) * 0.5
        );
    }

    static centering(verts: number[]) {
        let c = Object3d.getCenter(verts);
        for (let i = 0, len = verts.length; i < len; i += 3) {
            verts[i] -= c.x;
            verts[i + 1] -= c.y;
            verts[i + 2] -= c.z;
        }
    }

    public centering(): this {
        Object3d.centering(this._vertices);
        return this;
    }

    public applyMat4(m: Mat4): this {
        for (let i = 0, len = this._vertices.length; i < len; i += 3) {
            let v = new Vec3(this._vertices[i], this._vertices[i + 1], this._vertices[i + 2]),
                n = new Vec3(this._normals[i], this._normals[i + 1], this._normals[i + 2]);

            v = m.mulVec3(v);
            n = m.mulVec3(n);

            this._vertices[i] = v.x;
            this._vertices[i + 1] = v.y;
            this._vertices[i + 2] = v.z;

            this._normals[i] = n.x;
            this._normals[i + 1] = n.y;
            this._normals[i + 2] = n.z;
        }
        return this;
    }

    public scale(s: Vec3): this {
        Object3d.scale(this._vertices, s);
        return this;
    }

    public translate(v: Vec3): this {
        for (let i = 0, len = this._vertices.length; i < len; i += 3) {
            this._vertices[i] += v.x;
            this._vertices[i + 1] += v.y;
            this._vertices[i + 2] += v.z;
        }
        return this;
    }

    public get name(): string {
        return this._name;
    }

    public get vertices(): number[] {
        return this._vertices;
    }

    public get normals(): number[] {
        return this._normals;
    }

    public get indices(): number[] {
        return this._indices;
    }

    public get texCoords(): number[] {
        return this._texCoords;
    }

    public get numVertices(): number {
        return this._numVertices;
    }

    static scale(vertices: number[], s: Vec3) {
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i] *= s.x;
            vertices[i + 1] *= s.y;
            vertices[i + 2] *= s.z;
        }
    }

    static centroid(vertices: number[]) {
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

    static translate(vertices: number[], v: NumberArray3) {
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i] += v[0];
            vertices[i + 1] += v[1];
            vertices[i + 2] += v[2];
        }
    }

    static getNormals(vertices: number[]): number[] {
        let res = new Array(vertices.length);

        for (let i = 0; i < vertices.length; i += 9) {

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

    static createSphere(lonBands: number = 16, latBands: number = 16, radius: number = 1.0,
                        offsetX: number = 0, offsetY: number = 0, offsetZ: number = 0): Object3d {

        let vertices = [], indices = [], normals = [];

        for (let latNumber = 0; latNumber <= latBands; latNumber++) {
            let theta = latNumber * Math.PI / latBands;
            let sinTheta = Math.sin(theta);
            let cosTheta = Math.cos(theta);

            for (let longNumber = 0; longNumber <= lonBands; longNumber++) {
                let phi = longNumber * 2 * Math.PI / lonBands;
                let sinPhi = Math.sin(phi);
                let cosPhi = Math.cos(phi);
                let x = cosPhi * sinTheta + offsetX;
                let y = cosTheta + offsetY;
                let z = sinPhi * sinTheta + offsetZ;
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
                let first = (latNumber * (lonBands + 1)) + longNumber;
                let second = first + lonBands + 1;

                indices.push(first);
                indices.push(first + 1);
                indices.push(second);

                indices.push(second);
                indices.push(first + 1);
                indices.push(second + 1);
            }
        }

        return new Object3d({
            'vertices': vertices, 'normals': normals, 'indices': indices
        });
    }

    static createDisc(radius: number = 1.0, height: number = 0.0,
                      radialSegments: number = 8, isTop: boolean = true, startIndex: number = 0,
                      offsetX: number = 0, offsetY: number = 0, offsetZ: number = 0
    ): Object3d {

        let vertices = [], indices = [], normals = [];

        let thetaStart = 0.0, thetaLength = Math.PI * 2;

        let sign = isTop ? 1.0 : -1.0;

        let centerIndexStart = startIndex;

        for (let x = 1; x <= radialSegments; x++) {
            vertices.push(offsetX, height * sign + offsetY, offsetZ);
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
            if (isTop) {
                indices.push(i, i + 1, c);
            } else {
                indices.push(i + 1, i, c);
            }
        }

        return new Object3d({
            'vertices': vertices, 'normals': normals, 'indices': indices
        });
    }

    /**
     * Returns scale parameters for a frustum geoObject created with only Object3d.createFrustum();
     * @param length
     * @param horizontalAngle
     * @param verticalAngle
     */
    static getFrustumScaleByCameraAngles(length: number, horizontalAngle: number, verticalAngle: number): Vec3 {
        return new Vec3(
            2.0 * length * Math.tan(RADIANS_HALF * horizontalAngle),
            2.0 * length * Math.tan(RADIANS_HALF * verticalAngle),
            length
        );
    }

    /**
     * Returns scale parameters for a frustum geoObject created with only Object3d.createFrustum();
     * @param length
     * @param horizontalAngle
     * @param aspectRatio
     */
    static getFrustumScaleByCameraAspectRatio(length: number, horizontalAngle: number, aspectRatio: number): Vec3 {
        let vAngle = DEGREES_DOUBLE * Math.atan(Math.tan(RADIANS_HALF * horizontalAngle) / aspectRatio);
        return Object3d.getFrustumScaleByCameraAngles(length, horizontalAngle, vAngle);
    }

    static createFrustum(length: number = 1, width: number = 1, height: number = 1,
                         xOffset: number = 0, yOffset: number = 0, zOffset: number = 0): Object3d {

        width *= 0.5;
        height *= 0.5;

        return new Object3d({
            vertices: [
                //
                //inside
                //
                //top
                0 + xOffset, 0 + yOffset, 0 + zOffset,
                -1 * width + xOffset, 1 * height + yOffset, -1 * length + zOffset,
                1 * width + xOffset, 1 * height + yOffset, -1 * length + zOffset,
                //bottop
                0 + xOffset, 0 + yOffset, 0 + zOffset,
                1 * width + xOffset, -1 * height + yOffset, -1 * length + zOffset,
                -1 * width + xOffset, -1 * height + yOffset, -1 * length + zOffset,
                //right
                0 + xOffset, 0 + yOffset, 0 + zOffset,
                1 * width + xOffset, 1 * height + yOffset, -1 * length + zOffset,
                1 * width + xOffset, -1 * height + yOffset, -1 * length + zOffset,
                //left
                0 + xOffset, 0 + yOffset, 0 + zOffset,
                -1 * width + xOffset, -1 * height + yOffset, -1 * length + zOffset,
                -1 * width + xOffset, 1 * height + yOffset, -1 * length + zOffset,
                //
                // outside
                //
                //top
                0 + xOffset, 0 + yOffset, 0 + zOffset,
                1 * width + xOffset, 1 * height + yOffset, -1 * length + zOffset,
                -1 * width + xOffset, 1 * height + yOffset, -1 * length + zOffset,
                //bottop
                0 + xOffset, 0 + yOffset, 0 + zOffset,
                -1 * width + xOffset, -1 * height + yOffset, -1 * length + zOffset,
                1 * width + xOffset, -1 * height + yOffset, -1 * length + zOffset,
                //right
                0 + xOffset, 0 + yOffset, 0 + zOffset,
                1 * width + xOffset, -1 * height + yOffset, -1 * length + zOffset,
                1 * width + xOffset, 1 * height + yOffset, -1 * length + zOffset,
                //left
                0 + xOffset, 0 + yOffset, 0 + zOffset,
                -1 * width + xOffset, 1 * height + yOffset, -1 * length + zOffset,
                -1 * width + xOffset, -1 * height + yOffset, -1 * length + zOffset
            ]
        });
    }

    static createCylinder(radiusTop: number = 1.0, radiusBottom: number = 1.0, height: number = 1.0,
                          radialSegments: number = 32, heightSegments: number = 1.0, isTop: boolean = true,
                          isBottom: boolean = true, offsetX: number = 0, offsetY: number = 0, offsetZ: number = 0): Object3d {

        let vertices: number[] = [],
            indices: number[] = [],
            normals: number[] = [];

        let thetaStart = 0.0, thetaLength = Math.PI * 2;

        let index = 0;
        let indexArray = [];

        let normal = new Vec3();

        let slope = (radiusBottom - radiusTop) / height;

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

                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }

        if (radiusTop !== 0.0 && isTop) {
            let cap = Object3d.createDisc(radiusTop, height, radialSegments, true, index, offsetX, offsetY, offsetZ);
            vertices.push(...cap.vertices);
            normals.push(...cap.normals);
            indices.push(...cap.indices);
        }

        if (radiusBottom !== 0.0 && isBottom) {
            let cap = Object3d.createDisc(radiusBottom, 0, radialSegments, false, index + (isTop ? (1 + 2 * radialSegments) : 0), offsetX, offsetY, offsetZ);
            vertices.push(...cap.vertices);
            normals.push(...cap.normals);
            indices.push(...cap.indices);
        }

        return new Object3d({
            vertices: vertices,
            normals: normals,
            indices: indices
        });
    }

    static createCube(length: number = 1, height: number = 1, depth: number = 1,
                      xOffset: number = 0, yOffset: number = 0, zOffset: number = 0): Object3d {
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

    static createPlane(width: number = 1, height: number = 1, xOffset: number = 0, yOffset: number = 0, zOffset: number = 0): Object3d {
        let sx = width * 0.5, sy = yOffset, sz = height * 0.5;

        return new Object3d({
            vertices: [
                //bottom
                -sx + xOffset, sy, sz + zOffset, sx + xOffset, sy, -sz + zOffset, sx + xOffset, sy, sz + zOffset, -sx + xOffset, sy, sz + zOffset, -sx + xOffset, sy, -sz + zOffset, sx + xOffset, sy, -sz + zOffset,
                //top
                -sx + xOffset, sy, sz + zOffset, sx + xOffset, sy, sz + zOffset, sx + xOffset, sy, -sz + zOffset, -sx + xOffset, sy, sz + zOffset, sx + xOffset, sy, -sz + zOffset, -sx + xOffset, sy, -sz + zOffset
            ]
        });
    }

    static createArrow(back: number = 0.0, height: number = 2.1, front: number = -15): Object3d {
        return new Object3d({
            vertices: [0, height, 0, 7, 0, 6, 0, 0, front,
                0, 0, back, 7, 0, 6, 0, height, 0,
                -7, 0, 6, 0, 0, back, 0, height, 0,
                -7, 0, 6, 0, height, 0, 0, 0, front,
                -7, 0, 6, 0, 0, front, 0, 0, back, 0, 0, back, 0, 0, front, 7, 0, 6]
        });
    }


    static async loadObj(src: string): Promise<Object3d[]> {

        let obj = new Obj();

        const res = await obj.load(src);

        let materials = res.materials;

        return res.geometries.map(
            (obj: IObjGeometry) => {
                let mat = materials[obj.material];
                return new Object3d({
                    name: obj.object,
                    vertices: obj.data.vertices,
                    normals: obj.data.normals,
                    texCoords: obj.data.texCoords,
                    ambient: mat.ambient,
                    diffuse: mat.diffuse,
                    specular: mat.specular,
                    shininess: mat.shininess,
                    color: mat.color,
                    colorTexture: mat.colorTexture,
                    normalTexture: mat.normalTexture,
                    metallicRoughnessTexture: mat.metallicRoughnessTexture
                })
            }
        );
    }

    // merge(other: Object3d): Object3d {
    //     const mergedVertices = [...this._vertices, ...other.vertices];
    //     const mergedNormals = [...this._normals, ...other.normals];
    //     const mergedTexCoords = [...this._texCoords, ...other.texCoords];
    //
    //     const offset = this._vertices.length / 3;
    //     const mergedIndices = [
    //         ...this._indices,
    //         ...other.indices.map(index => index + offset)
    //     ];
    //
    //     return new Object3d({
    //         name: `${this._name}_${other.name}`,
    //         vertices: mergedVertices,
    //         texCoords: mergedTexCoords,
    //         indices: mergedIndices,
    //         normals: mergedNormals,
    //         color: this.color
    //     });
    // }
}

export {Object3d};