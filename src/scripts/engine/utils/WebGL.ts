export let gl: WebGL2RenderingContext;

export class WebGL {

    public static initialize(elementId: string): HTMLCanvasElement {
        const canvas = document.getElementById(elementId) as HTMLCanvasElement;
        if (canvas === undefined) {
            throw new Error('Passed element is not a valid canvas');
        }

        gl = canvas.getContext('webgl2');
        if (gl === undefined) {
            throw new Error('Failed to initialize WebGL');
        }

        return canvas;
    }
}