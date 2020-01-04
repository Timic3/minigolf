export const vertexSource = `#version 300 es
layout (location = 0) in vec3 aPosition;
uniform mat4 umWorld;
uniform mat4 umView;
uniform mat4 umProjection;
out vec4 vColor;

void main() {
    vColor = vec4(0.0, 1.0, 0.0, 1.0);
    gl_Position = umProjection * umView * umWorld * vec4(aPosition, 1.0);
}
`;

export const fragmentSource = `#version 300 es
precision mediump float;

in vec4 vColor;

out vec4 outColor;

void main() {
    outColor = vColor;
}
`;