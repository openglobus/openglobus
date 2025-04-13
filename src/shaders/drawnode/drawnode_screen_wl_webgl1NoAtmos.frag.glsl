precision highp float;

#include "../common/utils.glsl"
#include "./common.glsl"

uniform vec4 specular;
uniform vec3 diffuse;
uniform vec3 ambient;

uniform sampler2D uNormalMap;
uniform sampler2D nightTexture;
uniform sampler2D specularTexture;
uniform sampler2D defaultTexture;
uniform sampler2D samplerArr[SLICE_SIZE];

uniform vec4 tileOffsetArr[SLICE_SIZE];
uniform vec3 lightPosition;
uniform float layerOpacityArr[SLICE_SIZE];

uniform int samplerCount;
uniform float nightTextureCoefficient;
uniform float camHeight;

varying vec4 vTextureCoord;
varying vec3 v_vertex;
varying vec3 cameraPosition;
varying vec2 vGlobalTextureCoord;
varying float v_height;

vec3 sunPos;

void main(void) {

    sunPos = lightPosition;

    vec3 texNormal = texture2D(uNormalMap, vTextureCoord.zw).rgb;
    vec3 normal = normalize((texNormal - 0.5) * 2.0);

    float minH = 1200000.0;
    float maxH = minH * 3.0;
    float nightCoef = getLerpValue(minH, maxH, camHeight) * nightTextureCoefficient;

    // if(camHeight > 6000000.0)
    // {
    //     normal = normalize(v_vertex);
    // }

    vec3 lightDir = normalize(sunPos);
    vec3 viewDir = normalize(cameraPosition - v_vertex);

    float overGround = 1.0 - step(0.1, v_height);

    float shininess = texture2D(specularTexture, vGlobalTextureCoord.st).r * 255.0 * overGround;
    vec3 reflectionDirection = reflect(-lightDir, normal);
    float reflection = max(dot(reflectionDirection, viewDir), 0.0);
    vec3 spec = specular.rgb * pow(reflection, specular.w) * shininess;
    float diffuseLightWeighting = max(dot(normal, lightDir), 0.0);
    vec4 nightImageColor = texture2D(nightTexture, vGlobalTextureCoord.st);
    vec3 night = nightStep * (.18 - diffuseLightWeighting * 3.0) * nightImageColor.rgb * nightCoef;
    night *= overGround * step(0.0, night);
    vec4 lightWeighting = vec4(ambient + diffuse * diffuseLightWeighting + night, 1.0);

    gl_FragColor = texture2D(defaultTexture, vTextureCoord.xy);
    if (samplerCount == 0) {
        gl_FragColor = gl_FragColor * lightWeighting + vec4(spec, 0.0);
        return;
    }

    vec4 src;

    blend(gl_FragColor, samplerArr[0], tileOffsetArr[0], layerOpacityArr[0]);
    if (samplerCount == 1) {
        gl_FragColor = gl_FragColor * lightWeighting + vec4(spec, 0.0);
        return;
    }

    blend(gl_FragColor, samplerArr[1], tileOffsetArr[1], layerOpacityArr[1]);
    if (samplerCount == 2) {
        gl_FragColor = gl_FragColor * lightWeighting + vec4(spec, 0.0);
        return;
    }

    blend(gl_FragColor, samplerArr[2], tileOffsetArr[2], layerOpacityArr[2]);
    if (samplerCount == 3) {
        gl_FragColor = gl_FragColor * lightWeighting + vec4(spec, 0.0);
        return;
    }

    blend(gl_FragColor, samplerArr[3], tileOffsetArr[3], layerOpacityArr[3]);
    if (samplerCount == 4) {
        gl_FragColor = gl_FragColor * lightWeighting + vec4(spec, 0.0);
        return;
    }

    blend(gl_FragColor, samplerArr[4], tileOffsetArr[4], layerOpacityArr[4]);
    gl_FragColor = gl_FragColor * lightWeighting + vec4(spec, 0.0);
}