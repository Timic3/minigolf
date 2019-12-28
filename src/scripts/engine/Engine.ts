import { WebGL, gl } from './utils/WebGL';
import { Shader } from './utils/Shader';

import * as BasicShader from './shaders/Basic';
import { Buffer } from './utils/Buffer';

import { mat4, glMatrix } from 'gl-matrix';

export class Engine {
    private _canvas: HTMLCanvasElement;
    private _vertexBuffer: Buffer;
    private _indexBuffer: Buffer;
    private _shaders: Shader[] = [];

    private _pMatrix = mat4.create();
    private _vMatrix = mat4.identity(mat4.create());
    private _wMatrix = mat4.identity(mat4.create());

    private _iMatrix = mat4.identity(mat4.create());

    public constructor(elementId: string) {
        this._canvas = WebGL.initialize(elementId);
        window.onresize = this.resize;
        this.resize();
    }

    public start() {
        gl.clearColor(0, 0, 0, 1);
        gl.enable(gl.DEPTH_TEST); // Draw nearest vertices first
        gl.enable(gl.CULL_FACE); // Rasterizer, despite depth test, still checks behind these vertices - culling prevents that
        gl.frontFace(gl.CCW); // Vertices are appearing counter-clockwise
        gl.cullFace(gl.BACK); // Get rid of the back side

        this._shaders[0] = new Shader(BasicShader.vertexSource, BasicShader.fragmentSource);
        this._shaders[0].use();

        // Draw triangle (temporary)
        this._vertexBuffer = new Buffer();
        this._indexBuffer = new Buffer(gl.UNSIGNED_SHORT, gl.ELEMENT_ARRAY_BUFFER);
        this._vertexBuffer.addAttribute({
            location: this._shaders[0].getAttributeLocation('aPosition'),
            size: 3
        });
        this._vertexBuffer.addAttribute({
            location: this._shaders[0].getAttributeLocation('aColor'),
            size: 4
        });
        this._vertexBuffer.addData([
            // Top
            -1.0, 1.0, -1.0,  0.5, 0.5, 0.0, 1.0,
            -1.0, 1.0, 1.0,   0.5, 0.5, 0.0, 1.0,
            1.0, 1.0, 1.0,    0.5, 0.5, 0.0, 1.0,
            1.0, 1.0, -1.0,   0.5, 0.5, 0.0, 1.0,

            // Left
            -1.0, 1.0, 1.0,   0.5, 0.0, 0.5, 1.0,
            -1.0, -1.0, 1.0,  0.5, 0.0, 0.5, 1.0,
            -1.0, -1.0, -1.0, 0.5, 0.0, 0.5, 1.0,
            -1.0, 1.0, -1.0,  0.5, 0.0, 0.5, 1.0,

            // Right
            1.0, 1.0, 1.0,    0.5, 0.0, 0.0, 1.0,
            1.0, -1.0, 1.0,   0.5, 0.0, 0.0, 1.0,
            1.0, -1.0, -1.0,  0.5, 0.0, 0.0, 1.0,
            1.0, 1.0, -1.0,   0.5, 0.0, 0.0, 1.0,

            // Front
            1.0, 1.0, 1.0,    0.0, 0.5, 0.0, 1.0,
            1.0, -1.0, 1.0,   0.0, 0.5, 0.0, 1.0,
            -1.0, -1.0, 1.0,  0.0, 0.5, 0.0, 1.0,
            -1.0, 1.0, 1.0,   0.0, 0.5, 0.0, 1.0,

            // Back
            1.0, 1.0, -1.0,   0.0, 0.0, 0.5, 1.0,
            1.0, -1.0, -1.0,  0.0, 0.0, 0.5, 1.0,
            -1.0, -1.0, -1.0, 0.0, 0.0, 0.5, 1.0,
            -1.0, 1.0, -1.0,  0.0, 0.0, 0.5, 1.0,

            // Bottom
            -1.0, -1.0, -1.0, 0.5, 0.5, 1.0, 1.0,
            -1.0, -1.0, 1.0,  0.5, 0.5, 1.0, 1.0,
            1.0, -1.0, 1.0,   0.5, 0.5, 1.0, 1.0,
            1.0, -1.0, -1.0,  0.5, 0.5, 1.0, 1.0,
        ]);
        this._indexBuffer.addData([
            // Top
            0, 1, 2,
            0, 2, 3,

            // Left
            5, 4, 6,
            6, 4, 7,

            // Right
            8, 9, 10,
            8, 10, 11,

            // Front
            13, 12, 14,
            15, 14, 12,

            // Back
            16, 17, 18,
            16, 18, 19,

            // Bottom
            21, 20, 22,
            22, 20, 23
        ]);
        this._vertexBuffer.pass();
        this._indexBuffer.pass();

        mat4.perspective(this._pMatrix, glMatrix.toRadian(45), window.innerWidth / window.innerHeight, 0.1, 1000.0);
        mat4.translate(this._vMatrix, this._vMatrix, [0, 0, -6.5]);
        gl.uniformMatrix4fv(this._shaders[0].getUniformLocation('umWorld'), false, this._wMatrix);
        gl.uniformMatrix4fv(this._shaders[0].getUniformLocation('umView'), false, this._vMatrix);
        gl.uniformMatrix4fv(this._shaders[0].getUniformLocation('umProjection'), false, this._pMatrix);
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
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Draw triangle (temporary)
        const angle = performance.now() / 1000 / 6 * 2 * Math.PI;
        mat4.rotate(this._wMatrix, this._iMatrix, angle, [1, 1, 1]);
        gl.uniformMatrix4fv(this._shaders[0].getUniformLocation('umWorld'), false, this._wMatrix);

        this._vertexBuffer.bind();
        this._indexBuffer.bind();
        this._indexBuffer.draw();
        //

        requestAnimationFrame(this.loop.bind(this));
    }
}