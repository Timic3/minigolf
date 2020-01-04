import { WebGL, gl } from './utils/WebGL';
import { Shader } from './utils/Shader';
// import * as BasicShader from './shaders/Basic';
import * as TextureShader from './shaders/Texture';

import { mat4, glMatrix } from 'gl-matrix';
import OrbitalCamera from '../OrbitalCamera';
import { Entity } from './utils/Entity';

const load = require('@loaders.gl/core').load;
const GLTFLoader = require('@loaders.gl/gltf').GLTFLoader;

export class Engine {
    private _canvas: HTMLCanvasElement;

    private _entity: Entity;

    private _pMatrix: mat4 = mat4.create();
    private _vMatrix: mat4 = mat4.identity(mat4.create());
    private _wMatrix: mat4 = mat4.identity(mat4.create());

    private _orbitalController = new OrbitalCamera(this._wMatrix);

    public constructor(elementId: string) {
        this._canvas = WebGL.initialize(elementId);

        window.onresize = this.resize;

        this.resize();
    }

    public async start() {
        gl.clearColor(0.5, 0.5, 0.5, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST); // Draw nearest vertices first
        gl.enable(gl.CULL_FACE); // Rasterizer, despite depth test, still checks behind these vertices - culling prevents that
        gl.frontFace(gl.CCW); // Vertices are appearing counter-clockwise
        gl.cullFace(gl.BACK); // Get rid of the back side

        this._entity = new Entity("http://localhost:8080/assets/golf-court.glb");

        mat4.perspective(this._pMatrix, glMatrix.toRadian(45), window.innerWidth / window.innerHeight, 0.1, 1000.0);

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
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
        gl.clearColor(0.5, 0.5, 0.5, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this._orbitalController.update();

        mat4.perspective(this._pMatrix, glMatrix.toRadian(45), window.innerWidth / window.innerHeight, 0.1, 1000.0);
        this._entity.setProjectionMatrix(this._pMatrix);
        this._entity.draw(this._wMatrix);

        requestAnimationFrame(this.loop);
    }
}