import { WebGL, gl } from './utils/WebGL';
import { Shader } from './utils/Shader';

import * as BasicShader from './shaders/Basic';

export class Engine {
    private _canvas: HTMLCanvasElement;

    public constructor(elementId: string) {
        this._canvas = WebGL.initialize(elementId);
        window.onresize = this.resize;
    }

    public start() {
        gl.clearColor(0, 0, 0, 1);
        
        const basicShader = new Shader(BasicShader.vertexSource, BasicShader.fragmentSource);
        basicShader.use();

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
        requestAnimationFrame(this.loop.bind(this));
    }
}