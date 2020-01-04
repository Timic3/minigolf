export const vertexSource = `#version 300 es
layout (location = 0) in vec3 aPosition;
layout (location = 1) in vec3 aNormal;
layout (location = 2) in vec2 aTexCoord;
uniform mat4 umWorld;
uniform mat4 umView;
uniform mat4 umProjection;
out vec2 vTexCoord;

void main() {
    vNormal = mat3();
    gl_Position = umProjection * umView * umWorld * vec4(aPosition, 1.0);
}
`;

export const fragmentSource = `#version 300 es
precision mediump float;

in vec2 vTexCoord;

out vec4 outColor;
uniform sampler2D uSampler;

void main() {
    outColor = texture(uSampler, vTexCoord);
}
`;