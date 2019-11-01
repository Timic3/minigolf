
export class Engine {
    private _ticks = 0;

    public constructor() {
        console.log('Engine accessed');
    }

    public start() {
        this.loop();
    }

    private loop() {
        // console.log(this._ticks++);
        requestAnimationFrame(this.loop.bind(this));
    }
}