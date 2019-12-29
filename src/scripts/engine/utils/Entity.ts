import { gl } from './WebGL';
import { Buffer } from './Buffer';
import { Shader } from './Shader';

import * as TextureShader from '../shaders/Texture';
import { mat4 } from 'gl-matrix';

const load = require('@loaders.gl/core').load;
const GLTFLoader = require('@loaders.gl/gltf').GLTFLoader;

export class Entity {
    private _shader: Shader;
    private _vertexBuffer: Buffer;
    private _textureBuffer: Buffer;
    private _indexBuffer: Buffer;

    private _texture: WebGLTexture;

    private _pMatrix = mat4.create();
    private _vMatrix = mat4.identity(mat4.create());
    private _wMatrix = mat4.identity(mat4.create());

    private _iMatrix = mat4.identity(mat4.create());

    constructor(url: string) {
        this._shader = new Shader(TextureShader.vertexSource, TextureShader.fragmentSource);
        this._shader.use();
        this._vertexBuffer = new Buffer();
        this._textureBuffer = new Buffer();
        this._indexBuffer = new Buffer(gl.UNSIGNED_SHORT, gl.ELEMENT_ARRAY_BUFFER);

        this.initialize(url);
    }

    private async initialize(url: string) {
        this._vertexBuffer.addAttribute({
            location: this._shader.getAttributeLocation('aPosition'),
            size: 3
        });
        this._textureBuffer.addAttribute({
            location: this._shader.getAttributeLocation('aTexCoord'),
            size: 2
        });
        /*const loader = new GltfLoader();
        const asset = await loader.load(url);
        //console.log(asset.gltf);
        const image = await asset.imageData.get(0);
        const position = await asset.accessorData(asset.gltf.meshes[0].primitives[0].attributes.POSITION);
        const texCoords = await asset.accessorData(asset.gltf.meshes[0].primitives[0].attributes.TEXCOORD_0);
        const indices = await asset.accessorData(asset.gltf.meshes[0].primitives[0].indices);
        console.log(position.byteOffset);
        const positionTyped = new Float32Array(position.buffer, position.byteOffset);
        const texCoordsTyped = new Float32Array(texCoords.buffer, texCoords.byteOffset);
        const indicesTyped = new Uint16Array(indices.buffer, indices.byteOffset);
        console.log(positionTyped);*/

        const gltf = await load(url, GLTFLoader, {
            parserVersion: 2,
            postProcess: true,
        });
        console.log(gltf);

        this._vertexBuffer.addData(Array.from(gltf.meshes[0].primitives[0].attributes.POSITION.value));
        this._textureBuffer.addData(Array.from(gltf.meshes[0].primitives[0].attributes.TEXCOORD_0.value));
        this._indexBuffer.addData(Array.from(gltf.meshes[0].primitives[0].indices.value));

        //this._vertexBuffer.addData(Array.from(positionTyped));
        //this._textureBuffer.addData(Array.from(texCoordsTyped));
        //this._indexBuffer.addData(Array.from(indicesTyped));

        this._texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this._texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image as TexImageSource);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, gltf.images[0].image as TexImageSource);
        gl.bindTexture(gl.TEXTURE_2D, undefined);
        this._vertexBuffer.pass();
        this._textureBuffer.pass();
        this._indexBuffer.pass();

        mat4.translate(this._vMatrix, this._vMatrix, [0, 0, -0.5]);
        gl.uniformMatrix4fv(this._shader.getUniformLocation('uWorld'), false, this._wMatrix);
        gl.uniformMatrix4fv(this._shader.getUniformLocation('uView'), false, this._vMatrix);
        gl.uniformMatrix4fv(this._shader.getUniformLocation('uProjection'), false, this._pMatrix);
    }

    public setProjectionMatrix(projectionMatrix: mat4) {
        this._pMatrix = projectionMatrix;
    }

    public draw() {
        const angle = performance.now() / 1000 / 6 * 2 * Math.PI;
        mat4.rotate(this._wMatrix, this._iMatrix, angle, [0, 1, 0]);
        gl.uniformMatrix4fv(this._shader.getUniformLocation('uWorld'), false, this._wMatrix);

        this._vertexBuffer.bind();
        this._textureBuffer.bind();
        this._indexBuffer.bind();
        gl.bindTexture(gl.TEXTURE_2D, this._texture);
        gl.activeTexture(gl.TEXTURE0);
        this._indexBuffer.draw();
    }
}