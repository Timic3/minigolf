export const vertexSource = `
attribute vec3 aPosition;

void main() {
    gl_Position = vec4(aPosition, 1.0);
}
`;

export const fragmentSource = `
precision mediump float;

void main() {
    gl_FragColor = vec4(1.0);
}
`;