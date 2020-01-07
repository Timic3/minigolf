export const vertexSource = `
layout (location = 0) in vec3 aPosition;
layout (location = 1) in vec3 aNormals;
layout (location = 3) in vec4 aColor;

uniform mat4 uView;
uniform mat4 uProjection;
out vec4 vColor;

void main() {
    vColor = aColor;
    gl_Position = uProjection * uView * vec4(aPosition, 1.0);
}
`;

export const fragmentSource = `
precision mediump float;

uniform vec3 u_LightDirection;
uniform vec3 u_LightColor;

uniform vec3 u_AmbientLightColor;
uniform float u_AmbientLightIntensity;

uniform float uMetallicFactor;
uniform float uRoughnessFactor;
uniform vec4 uBaseColorFactor;

struct PBRInfo
{
    float NdotL;                  // cos angle between normal and light direction
    float NdotV;                  // cos angle between normal and view direction
    float NdotH;                  // cos angle between normal and half vector
    float LdotH;                  // cos angle between light direction and half vector
    float VdotH;                  // cos angle between view direction and half vector
    float perceptualRoughness;    // roughness value, as authored by the model creator (input to shader)
    float metalness;              // metallic value at the surface
    vec3 reflectance0;            // full reflectance color (normal incidence angle)
    vec3 reflectance90;           // reflectance color at grazing angle
    float alphaRoughness;         // roughness mapped to a more linear change in the roughness (proposed by [2])
    vec3 diffuseColor;            // color contribution from diffuse lighting
    vec3 specularColor;           // color contribution from specular lighting
};

in vec4 vColor;

out vec4 outColor;

void main() {
    vec3 diffuseColor = vec3(0.0);
    diffuseColor = uBaseColorFactor.rgb * (vec3(1.0) - vec3(0.04)) * (1.0 - uMetallicFactor);
    outColor = vec4(toneMap(diffuseColor), 1.0);
}
`;