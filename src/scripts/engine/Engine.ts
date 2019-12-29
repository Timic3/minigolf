import { WebGL, gl } from './utils/WebGL';

import { Entity } from './utils/Entity';
import { mat4, glMatrix } from 'gl-matrix';

export class Engine {
    private _canvas: HTMLCanvasElement;

    private _object: Entity;

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

        this._object = new Entity('http://localhost:8080/assets/avocado.glb');
        
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, glMatrix.toRadian(45), this._canvas.width / this._canvas.height, 0.1, 1000.0);
        this._object.setProjectionMatrix(projectionMatrix);

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
        gl.clearColor(0.5, 0.5, 0.5, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this._object.draw();

        requestAnimationFrame(this.loop.bind(this));
    }
}