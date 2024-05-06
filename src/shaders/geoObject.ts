import {Program} from "../webgl/Program";

export const geo_object = (): Program =>
    new Program("geo_object", {
        uniforms: {
            viewMatrix: "mat4",
            projectionMatrix: "mat4",

            uScaleByDistance: "vec3",

            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",

            lightsPositions: "vec3",
            lightsParamsv: "vec3",
            lightsParamsf: "float",

            uTexture: "sampler2d",
            uUseTexture: "float"
        },
        attributes: {
            aVertexPosition: "vec3",
            aVertexNormal: "vec3",
            aTexCoord: "vec2",

            aPositionHigh: {type: "vec3", divisor: 1},
            aPositionLow: {type: "vec3", divisor: 1},
            aDirection: {type: "vec3", divisor: 1},
            aPitchRoll: {type: "vec2", divisor: 1},
            aColor: {type: "vec4", divisor: 1},
            aScale: {type: "vec3", divisor: 1},
            aDispose: {type: "float", divisor: 1}
        },
        vertexShader:
            `precision highp float;
            
            attribute vec3 aVertexPosition;
            attribute vec3 aVertexNormal; 
            attribute vec3 aPositionHigh;
            attribute vec3 aPositionLow;    
            attribute vec3 aDirection;
            attribute vec2 aPitchRoll;
            attribute vec4 aColor;
            attribute vec3 aScale;
            attribute float aDispose;
            attribute float aUseTexture;
            attribute vec2 aTexCoord;
            
            uniform vec3 uScaleByDistance;
            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;

            varying vec3 cameraPosition;
            varying vec3 vNormal;
            varying vec3 v_vertex;           
            varying vec4 vColor;
            varying float vDispose;
            varying vec2 vTexCoords;
            //varying float useLighting;
            
            const float PI = 3.141592653589793;
            
            const float RADIANS = PI / 180.0;
           
            void main(void) {
                        
                if (aDispose == 0.0) {
                   return;
                }
                
                vec3 position = aPositionHigh + aPositionLow;
                cameraPosition = eyePositionHigh + eyePositionLow;
                
                vec3 look = cameraPosition - position;
                float lookLength = length(look);

                // useLighting = 1.0;                
                // if(lookLength > 2000000.0){
                //      useLighting = 0.0;
                // }

            
                vColor = aColor;
                vTexCoords = aTexCoord;
              
                float cos_roll = cos(aPitchRoll.y);
                float sin_roll = sin(aPitchRoll.y);
                
                mat3 rotZ = mat3(
                     vec3(cos_roll, sin_roll, 0.0),
                     vec3(-sin_roll, cos_roll, 0.0), 
                     vec3(0.0, 0.0, 1.0) 
                );

                float cos_pitch = cos(aPitchRoll.x);
                float sin_pitch = sin(aPitchRoll.x);

                mat3 rotX = mat3(
                    vec3(1.0, 0.0, 0.0),
                    vec3(0.0, cos_pitch, sin_pitch), 
                    vec3(0.0, -sin_pitch, cos_pitch) 
               );

                vec3 r = cross(normalize(-position), aDirection);
                mat3 modelMatrix = mat3(r, normalize(position), -aDirection) * rotX * rotZ;

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                vec3 highDiff = aPositionHigh - eyePositionHigh;
                vec3 lowDiff = aPositionLow - eyePositionLow;
             
                vNormal = modelMatrix * aVertexNormal;
                               
                // if(lookLength > uScaleByDistance[1])
                // {
                //     scd = uScaleByDistance[1] / uScaleByDistance[0];
                // }
                // else if(lookLength > uScaleByDistance[0])
                // {
                //     scd = lookLength / uScaleByDistance[0];
                // }
                // ... is the same math
                float scd = uScaleByDistance[2] * clamp(lookLength, uScaleByDistance[0], uScaleByDistance[1]) / uScaleByDistance[0];
                
                vec3 vert = modelMatrix * (aVertexPosition * aScale) * scd;
                v_vertex = position + vert;
                
                // @hack
                // Mac/Safari affects on lowDiff somehow. 
                vert += lowDiff;
                               
                gl_Position = projectionMatrix * viewMatrixRTE  * vec4(highDiff + vert, 1.0);
            }`,

        fragmentShader: `precision highp float;

                #define MAX_POINT_LIGHTS 1
                
                uniform vec3 lightsPositions[MAX_POINT_LIGHTS];
                uniform vec3 lightsParamsv[MAX_POINT_LIGHTS * 3];
                uniform float lightsParamsf[MAX_POINT_LIGHTS];
                uniform sampler2D uTexture;
                uniform float uUseTexture;
                            
                varying vec3 cameraPosition;
                varying vec3 v_vertex;                
                varying vec4 vColor;
                varying vec3 vNormal;
                varying vec2 vTexCoords;
                //varying float useLighting;
                
                void main(void) {        
                                        
                    vec3 lightWeighting = vec3(1.0);
                
                    //if(useLighting != 0.0){
                        vec3 normal = normalize(vNormal);
                        vec3 lightDir = normalize(lightsPositions[0]);
                        vec3 viewDir = normalize(cameraPosition - v_vertex);                
                        vec3 reflectionDirection = reflect(-lightDir, normal);
                        float reflection = max( dot(reflectionDirection, viewDir), 0.0);
                        float specularLightWeighting = pow( reflection, lightsParamsf[0]);                                        
                        float diffuseLightWeighting = max(dot(normal, lightDir), 0.0);
                        lightWeighting = lightsParamsv[0] + lightsParamsv[1] * diffuseLightWeighting + lightsParamsv[2] * specularLightWeighting;
                    //}
                                       
                    if(uUseTexture > 0.0) {
                        vec4 tColor = texture2D(uTexture, vTexCoords);
                        gl_FragColor = vec4(tColor.rgb * lightWeighting, tColor.a);
                    } else {
                        gl_FragColor = vec4(vColor.rgb * lightWeighting, vColor.a);
                    }
                }`
    });

export const geo_object_picking = (): Program =>
    new Program("geo_object_picking", {
        uniforms: {
            viewMatrix: "mat4",
            projectionMatrix: "mat4",
            uScaleByDistance: "vec3",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            pickingScale: "float"
        },
        attributes: {
            aVertexPosition: "vec3",
            aPositionHigh: {type: "vec3", divisor: 1},
            aPositionLow: {type: "vec3", divisor: 1},
            aDirection: {type: "vec3", divisor: 1},
            aPitchRoll: {type: "vec2", divisor: 1},
            aPickingColor: {type: "vec3", divisor: 1},
            aScale: {type: "vec3", divisor: 1},
            aDispose: {type: "float", divisor: 1}
        },
        vertexShader: `precision highp float;

            attribute vec3 aVertexPosition;
            attribute vec3 aPositionHigh;
            attribute vec3 aPositionLow;    
            attribute vec3 aDirection;
            attribute vec3 aPickingColor;
            attribute vec2 aPitchRoll;
            attribute vec3 aScale;
            attribute float aDispose;
            
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;
            uniform vec3 uScaleByDistance;
            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform float pickingScale;

            varying vec3 vColor;
            
            const float RADIANS = 3.141592653589793 / 180.0;

            void main(void) {

                if (aDispose == 0.0) {
                    return;
                 }
            
                 vColor = aPickingColor;
               
                float cos_roll = cos(aPitchRoll.y);
                float sin_roll = sin(aPitchRoll.y);
                
                mat3 rotZ = mat3(
                     vec3(cos_roll, sin_roll, 0.0),
                     vec3(-sin_roll, cos_roll, 0.0), 
                     vec3(0.0, 0.0, 1.0) 
                );

                float cos_pitch = cos(aPitchRoll.x);
                float sin_pitch = sin(aPitchRoll.x);

                mat3 rotX = mat3(
                    vec3(1.0, 0.0, 0.0),
                    vec3(0.0, cos_pitch, sin_pitch), 
                    vec3(0.0, -sin_pitch, cos_pitch) 
               );
 
                 vec3 position = aPositionHigh + aPositionLow;
                 vec3 cameraPosition = eyePositionHigh + eyePositionLow;
                 vec3 r = cross(normalize(-position), aDirection);
                 mat3 modelMatrix = mat3(r, normalize(position), -aDirection) * rotX * rotZ;
 
                 mat4 viewMatrixRTE = viewMatrix;
                 viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);
 
                 vec3 highDiff = aPositionHigh - eyePositionHigh;
                 vec3 lowDiff = aPositionLow - eyePositionLow;
              
                 vec3 look = cameraPosition - position;
                 float lookLength = length(look);
                                
                 // if(lookLength > uScaleByDistance[1])
                 // {
                 //     scd = uScaleByDistance[1] / uScaleByDistance[0];
                 // }
                 // else if(lookLength > uScaleByDistance[0])
                 // {
                 //     scd = lookLength / uScaleByDistance[0];
                 // }
                 // ... is the same math above
                 // @hack
                 // pickingScale replace to this line, because when it s
                 // tays in the vert above it affects on Mac Safari jitter
                 float scd = pickingScale * uScaleByDistance[2] * clamp(lookLength, uScaleByDistance[0], uScaleByDistance[1]) / uScaleByDistance[0];

                 vec3 vert = modelMatrix * (aVertexPosition * aScale) * scd;
                 
                 vert += lowDiff;
                                
                 gl_Position = projectionMatrix * viewMatrixRTE  * vec4(highDiff + vert, 1.0);
            }`,
        fragmentShader:
            `precision highp float;
            varying vec3 vColor;
            void main () {
                gl_FragColor = vec4(vColor, 1.0);
            }`
    });
