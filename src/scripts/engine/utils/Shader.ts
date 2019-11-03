import { gl } from './WebGL';

export class Shader {
    private _program: WebGLProgram;

    public constructor(vertexSource: string, fragmentSource: string) {
        const vertexShader = this.loadShader(vertexSource, gl.VERTEX_SHADER);
        const fragmentShader = this.loadShader(fragmentSource, gl.FRAGMENT_SHADER);

        this._program = gl.createProgram();

        gl.attachShader(this._program, vertexShader);
        gl.attachShader(this._program, fragmentShader);

        gl.linkProgram(this._program);

        // Check linking errors
        if (!gl.getProgramParameter(this._program, gl.LINK_STATUS)) {
            throw new Error(`Program link failed\n${gl.getProgramInfoLog(this._program)}`);
        }
    }

    public use() {
        gl.useProgram(this._program);
    }

    private loadShader(source: string, shaderType: number): WebGLShader {
        const shader = gl.createShader(shaderType);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        // Check compilation errors
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(`Shader compilation failed (${shaderType})\n${gl.getShaderInfoLog(shader)}`);
        }

        return shader;
    }
}