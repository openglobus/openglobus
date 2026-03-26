void getPhongLighting(
in vec3 _v_vertex,
in vec3 _sunPos,
in vec3 _cameraPosition,
in vec3 _normal,
in vec3 _ambient,
in vec3 _diffuse,
in vec4 _specular,
in float _shininess,
out vec3 _spec,
out vec4 _lightWeighting
){

    vec3 lightDir = normalize(_sunPos);
    vec3 viewDir = normalize(_cameraPosition - _v_vertex);

    vec3 reflectionDirection = reflect(-lightDir, _normal);
    float reflection = max(dot(reflectionDirection, viewDir), 0.0);
    float diffuseLightWeighting = max(dot(_normal, lightDir), 0.0);

    _spec = _specular.rgb * pow(reflection, _specular.w) * _shininess;
    _lightWeighting = vec4(_ambient + _diffuse * diffuseLightWeighting, 1.0);
}
