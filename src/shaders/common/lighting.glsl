void getPhongLighting(
in vec3 vertex,
in vec3 lightPos,
in vec3 cameraPos,
in vec3 normal,
in vec3 ambient,
in vec3 diffuse,
in vec4 specular,
in float specularMask,
out vec3 outSpecularWeighting,
out vec4 outLightWeighting
){

    vec3 lightDir = normalize(lightPos);
    vec3 viewDir = normalize(camPos - vertex);

    vec3 reflectionDir = reflect(-lightDir, _normal);
    float reflection = max(dot(reflectionDir, viewDir), 0.0);
    float diffuseLightWeighting = max(dot(normal, lightDir), 0.0);

    outSpecularWeighting = specular.rgb * pow(reflection, specular.w) * specularMask;
    outLightWeighting = vec4(ambient + diffuse * diffuseLightWeighting, 1.0);
}
