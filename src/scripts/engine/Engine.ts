
export class Engine {
    private _gl: WebGL2RenderingContext;
    private _canvas: HTMLCanvasElement;

    public constructor(element: HTMLCanvasElement) {
        if (this._canvas === undefined) {
            this._canvas = element;
        }

        this._gl = this._canvas.getContext('webgl2');
        if (this._gl === undefined) {
            throw new Error('Failed to initialize WebGL');
        }
    }

    public start() {
        const gl = this._gl;
        gl.clearColor(0, 0, 0, 1);
        this.loop();
    }

    private loop() {
        const gl = this._gl;
        gl.clear(gl.COLOR_BUFFER_BIT);
        requestAnimationFrame(this.loop.bind(this));
    }
}