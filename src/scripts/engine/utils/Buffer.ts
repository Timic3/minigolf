import { gl } from "./WebGL";

export class AttributeInfo {
    location: number;
    size: number;
    offset?: number;
}

export class Buffer {
    private _buffer: WebGLBuffer;

    private _itemSize: number; // Size of each element in the buffer
    private _stride: number;
    
    private _bufferType: number; // ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER
    private _dataType: number; // FLOAT, INT, etc.
    private _typeSize: number;
    private _drawMode: number; // TRIANGLES, LINES, etc.

    private _data: Array<number> = [];
    private _attributes: Array<AttributeInfo> = [];

    public constructor(dataType: number = gl.FLOAT, bufferType: number = gl.ARRAY_BUFFER, drawMode: number = gl.TRIANGLES) {
        this._itemSize = 0;
        this._dataType = dataType;
        this._bufferType = bufferType;
        this._drawMode = drawMode;

        switch (dataType) {
            case gl.FLOAT:
                this._typeSize = 4;
                break;
            case gl.UNSIGNED_SHORT:
                this._typeSize = 2;
                break;
        }

        this._buffer = gl.createBuffer();
    }

    public destroy(): void {
        gl.deleteBuffer(this._buffer);
    }

    public bind(): void {
        gl.bindBuffer(this._bufferType, this._buffer);

        for (const attribute of this._attributes) {
            gl.vertexAttribPointer(attribute.location, attribute.size, this._dataType, false, this._stride, attribute.offset * this._typeSize);
            gl.enableVertexAttribArray(attribute.location);
        }
    }

    public unbind(): void {
        for (const attribute of this._attributes) {
            gl.disableVertexAttribArray(attribute.location);
        }

        gl.bindBuffer(this._bufferType, undefined);
    }

    public addAttribute(info: AttributeInfo): void {
        info.offset = this._itemSize;
        this._attributes.push(info);
        this._itemSize += info.size;
        this._stride = this._itemSize * this._typeSize;
    }

    public addData(data: Array<number>): void {
        for (const number of data) {
            this._data.push(number);
        }
    }

    // Pass the data to GPU
    public pass(): void {
        gl.bindBuffer(this._bufferType, this._buffer);

        let buffer: ArrayBuffer;
        switch (this._dataType) {
            case gl.FLOAT:
                buffer = new Float32Array(this._data);
                break;
            case gl.UNSIGNED_SHORT:
                buffer = new Uint16Array(this._data);
                break;
        }

        gl.bufferData(this._bufferType, buffer, gl.STATIC_DRAW);

        this.unbind();
    }

    public draw(): void {
        switch (this._bufferType) {
            case gl.ARRAY_BUFFER:
                gl.drawArrays(this._drawMode, 0, this._data.length / this._itemSize);
                break;
            case gl.ELEMENT_ARRAY_BUFFER:
                gl.drawElements(this._drawMode, this._data.length, this._dataType, 0);
                break;
        }
    }
}