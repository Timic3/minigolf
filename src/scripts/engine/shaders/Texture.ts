export const vertexSource = `
layout (location = 0) in vec3 aPosition;
layout (location = 2) in vec2 aTexCoord;
uniform mat4 uView;
uniform mat4 uProjection;
out vec2 vTexCoord;

void main() {
    vTexCoord = aTexCoord;
    gl_Position = uProjection * uView * vec4(aPosition, 1.0);
}
`;

export const fragmentSource = `
precision mediump float;

in vec2 vTexCoord;

out vec4 outColor;
uniform sampler2D uSampler;

void main() {
    outColor = texture(uSampler, vTexCoord);
}
`;