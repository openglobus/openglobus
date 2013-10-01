goog.provide('og.webgl.shaderTypes');

og.webgl.shaderTypes._types = ["FLOAT", "DOUBLE", "BOOL", "INT", "UINT", "VEC2", "VEC3", "VEC4", "DVEC2",
                               "DVEC3", "DVEC4", "BVEC2", "BVEC3", "BVEC4", "IVEC2", "IVEC3", "IVEC4", "UVEC2",
                               "UVEC3", "UVEC4", "MAT2", "DMAT2", "MAT3", "DMAT3", "MAT4", "DMAT4", "MAT2X3",
                               "MAT2X4", "MAT3X2", "MAT3X4", "MAT4X2", "MAT4X3", "DMAT2X3", "DMAT2X4", "DMAT3X2", "DMAT3X4",
                               "DMAT4X2", "DMAT4X3", "SAMPLER1D", "SAMPLER2D", "SAMPLER3D", "SAMPLERCUBE", "SAMPLER2DSHADOW"];


(function () {
    for (var i = 0; i < og.webgl.shaderTypes._types.length; i++)
        og.webgl.shaderTypes[og.webgl.shaderTypes._types[i]] = i;
})();
