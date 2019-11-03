export const vertexSource = `#version 300 es
in vec3 position;

out vec4 color;

void main() {
    color = vec4(abs((position.xy - 1.0) / 2.0), 0.0, 1.0);
    gl_Position = vec4(position, 1.0);
}
`;

export const fragmentSource = `#version 300 es
precision mediump float;

in vec4 color;

out vec4 outColor;

void main() {
    outColor = color;
}
`;