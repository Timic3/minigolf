import { WebGL, gl } from './utils/WebGL';
import { Shader } from './utils/Shader';

import * as BasicShader from './shaders/Basic';

export class Engine {
    private _canvas: HTMLCanvasElement;
    private _buffer: WebGLBuffer;

    public constructor(elementId: string) {
        this._canvas = WebGL.initialize(elementId);
        window.onresize = this.resize;
        this.resize();
    }

    public start() {
        gl.clearColor(0, 0, 0, 1);

        const basicShader = new Shader(BasicShader.vertexSource, BasicShader.fragmentSource);
        basicShader.use();

        // Draw triangle (temporary)
        this._buffer = gl.createBuffer();
        const vertices = [
            -0.5, -0.5, 0,
            0, 0.5, 0,
            0.5, -0.5, 0
        ];

        gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, undefined);
        //

        this.loop();
    }

    private resize() {
        if (this._canvas !== undefined) {
            this._canvas.width = window.innerWidth;
            this._canvas.height = window.innerHeight;
            gl.viewport(0, 0, this._canvas.width, this._canvas.height);
        }
    }

    private loop() {
        // Clear the color buffer of the screen, otherwise we draw each frame on top of each other.
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Draw triangle (temporary)
        gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);

        gl.drawArrays(gl.TRIANGLES, 0, 3);

        gl.bindBuffer(gl.ARRAY_BUFFER, undefined);
        gl.disableVertexAttribArray(0);
        //

        requestAnimationFrame(this.loop.bind(this));
    }
}