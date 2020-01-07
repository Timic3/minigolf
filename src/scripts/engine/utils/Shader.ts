import { gl } from './WebGL';

interface Attribute {
    [name: string]: number;
}

interface Uniform {
    [name: string]: WebGLUniformLocation;
}

export class Shader {
    private _program: WebGLProgram;
    private _attributes: Attribute = {};
    private _uniforms: Uniform = {};

    private _headers = '#version 300 es\n\n';

    private _vertexSource: string;
    private _fragmentSource: string;

    public constructor(vertexSource: string, fragmentSource: string) {
        this._vertexSource = vertexSource;
        this._fragmentSource = fragmentSource;
    }

    public define(header: string) {
        this._headers += "#define " + header + '\n';
    }

    public build() {
        const vertexShader = this.loadShader(this._headers + this._vertexSource, gl.VERTEX_SHADER);
        const fragmentShader = this.loadShader(this._headers + this._fragmentSource, gl.FRAGMENT_SHADER);

        this._program = gl.createProgram();

        gl.attachShader(this._program, vertexShader);
        gl.attachShader(this._program, fragmentShader);

        gl.linkProgram(this._program);

        // Check linking errors
        if (!gl.getProgramParameter(this._program, gl.LINK_STATUS)) {
            throw new Error(`Program link failed\n${gl.getProgramInfoLog(this._program)}`);
        }

        // Get all active attributes and put them into dictionary
        for (let i = 0; i < gl.getProgramParameter(this._program, gl.ACTIVE_ATTRIBUTES); ++i) {
            const info: WebGLActiveInfo = gl.getActiveAttrib(this._program, i);
            this._attributes[info.name] = gl.getAttribLocation(this._program, info.name);
        }

        // Get all active uniforms and put them into dictionary
        for (let i = 0; i < gl.getProgramParameter(this._program, gl.ACTIVE_UNIFORMS); ++i) {
            const info: WebGLActiveInfo = gl.getActiveUniform(this._program, i);
            this._uniforms[info.name] = gl.getUniformLocation(this._program, info.name);
        }
    }

    public use() {
        gl.useProgram(this._program);
    }

    public getAttributeLocation(name: string): number {
        if (this._attributes[name] === undefined) {
            throw new Error(`Attribute location '${name}' not found`);
        }
        return this._attributes[name];
    }

    public getUniformLocation(name: string): WebGLUniformLocation {
        if (this._uniforms[name] === undefined) {
            throw new Error(`Uniform location '${name}' not found`);
        }
        return this._uniforms[name];
    }

    private loadShader(source: string, shaderType: number): WebGLShader {
        const shader = gl.createShader(shaderType);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        // Check compilation errors
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(`Shader compilation failed (${shaderType === gl.VERTEX_SHADER ? 'VERTEX_SHADER' : 'FRAGMENT_SHADER'})\n${gl.getShaderInfoLog(shader)}`);
        }

        return shader;
    }
}