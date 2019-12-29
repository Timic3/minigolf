export const vertexSource = `#version 300 es
in vec3 aPosition;
in vec2 aTexCoord;
uniform mat4 uWorld;
uniform mat4 uView;
uniform mat4 uProjection;
out vec2 vTexCoord;

void main() {
    vTexCoord = aTexCoord;
    gl_Position = uProjection * uView * uWorld * vec4(aPosition, 1.0);
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