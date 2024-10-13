export interface IObjGeometryData {
    vertices: number[];
    textures: number[];
    normals: number[];
}

export interface IObjGeometry {
    object: string;
    groups: string[];
    material: string;
    data: IObjGeometryData
}

interface IObjData {
    geometries: IObjGeometry[];
    materialLibs: string[];
}

export function objParser(text: string) {
    const objPositions: number[][] = [[0, 0, 0]];
    const objTexcoords: number[][] = [[0, 0]];
    const objNormals: number[][] = [[0, 0, 0]];

    // same order as `f` indices
    const objVertexData: [number[][], number[][], number[][]] = [
        objPositions,
        objTexcoords,
        objNormals,
    ];

    // same order as `f` indices
    let vertexData: [number[], number[], number[]] = [
        [],   // positions
        [],   // texcoords
        [],   // normals
    ];

    const materialLibs: string[] = [];
    const geometries: IObjGeometry[] = [];
    let geometry: IObjGeometry | null;

    let groups: string[] = ['default'];
    let material: string = 'default';
    let object: string = 'default';

    function newGeometry() {
        // If there is an existing geometry and it's
        // not empty then start a new one.
        if (geometry && geometry.data.vertices.length) {
            geometry = null;
        }
    }

    function setGeometry() {
        if (!geometry) {

            const vertices: number[] = [];
            const textures: number[] = [];
            const normals: number[] = [];

            vertexData = [
                vertices,
                textures,
                normals,
            ];

            geometry = {
                object,
                groups,
                material,
                data: {
                    vertices,
                    textures,
                    normals,
                },
            };

            geometries.push(geometry);
        }
    }

    function addVertex(vert: string) {
        const ptn = vert.split('/');
        ptn.forEach((objIndexStr: string, i: number) => {
            if (!objIndexStr) {
                return;
            }
            const objIndex = parseInt(objIndexStr);
            const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
            vertexData[i].push(...objVertexData[i][index]);
        });
    }

    const keywords: Record<string, (parts: string[], unparsedArgs: string) => void> = {
        v(parts: string[]) {
            objPositions.push(parts.map(parseFloat));
        },
        vn(parts: string[]) {
            objNormals.push(parts.map(parseFloat));
        },
        vt(parts: string[]) {
            // should check for missing v and extra w?
            objTexcoords.push(parts.map(parseFloat));
        },
        f(parts: string[]) {
            setGeometry();
            const numTriangles = parts.length - 2;
            for (let tri = 0; tri < numTriangles; ++tri) {
                addVertex(parts[0]);
                addVertex(parts[tri + 1]);
                addVertex(parts[tri + 2]);
            }
        },
        s: () => {
        },
        mtllib(parts: string[], unparsedArgs: string) {
            console.log("**** mtlib *****");
            console.warn(parts, unparsedArgs);
            // the spec says there can be multiple filenames here
            // but many exist with spaces in a single filename
            materialLibs.push(unparsedArgs);
        },
        usemtl(parts: string[], unparsedArgs: string) {
            material = unparsedArgs;
            console.log("**** usemtl *****");
            console.warn(parts, unparsedArgs);
            newGeometry();
        },
        g(parts: string[]) {
            groups = parts;
            newGeometry();
        },
        o(parts: string[], unparsedArgs: string) {
            object = unparsedArgs;
            newGeometry();
        },
    };

    const keywordRE = /(\w*)(?: )*(.*)/;
    const lines = text.split('\n');
    for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
        const line = lines[lineNo].trim();
        if (line === '' || line.startsWith('#')) {
            continue;
        }
        const m = keywordRE.exec(line);
        if (!m) {
            continue;
        }
        const [, keyword, unparsedArgs] = m;
        const parts = line.split(/\s+/).slice(1);
        const handler = keywords[keyword];
        if (!handler) {
            console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
            continue;
        }
        handler(parts, unparsedArgs);
    }

    // remove any arrays that have no entries.
    for (const geometry of geometries) {
        geometry.data = Object.fromEntries(
            Object.entries(geometry.data).filter(([key, array]) => array.length > 0)
        ) as IObjGeometryData;
    }

    return {
        geometries,
        materialLibs,
    };
}

export function transformLeftToRightCoordinateSystem(objData: IObjData): {
    geometries: IObjGeometry[],
    materialLibs: string[]
} {

    const convertedGeometries: IObjGeometry[] = objData.geometries.map(geometry => {
        const vertices = geometry.data.vertices;
        const normals = geometry.data.normals;
        const textures = geometry.data.textures || [];

        rotateObject(geometry.data, 0);

        let convertedVertices: number[] = [];
        let convertedNormals: number[] = [];
        let convertedTextures: number[] = [];

        // Convert positions
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const z = vertices[i + 2];
            convertedVertices.push(x, y, z);
        }

        // Convert normals
        for (let i = 0; i < normals.length; i += 3) {
            const x = normals[i];
            const y = normals[i + 1];
            const z = normals[i + 2];
            convertedNormals.push(x, y, z);
        }

        // Convert textures
        for (let i = 0; i < textures.length; i += 2) {
            const s = textures[i];
            const t = 1 - textures[i + 1];
            convertedTextures.push(s, t);
        }

        return {
            object: geometry.object,
            groups: geometry.groups,
            material: geometry.material,
            data: {
                vertices: convertedVertices,
                normals: convertedNormals,
                textures: convertedTextures
            }
        };
    });

    return {
        geometries: convertedGeometries,
        materialLibs: objData.materialLibs
    };
}

function rotateObject(obj: IObjGeometryData, angle: number): { vertices: number[], normals: number[] } {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const vertices = obj.vertices;
    const normals = obj.normals;

    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const z = vertices[i + 2];

        vertices[i] = x * cosA + z * sinA;
        vertices[i + 1] = y;
        vertices[i + 2] = -x * sinA + z * cosA;

        const nx = normals[i];
        const ny = normals[i + 1];
        const nz = normals[i + 2];

        normals[i] = nx * cosA + nz * sinA;
        normals[i + 1] = ny;
        normals[i + 2] = -nx * sinA + nz * cosA;
    }

    return {
        vertices: vertices,
        normals: normals
    };
}

