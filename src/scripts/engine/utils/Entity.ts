import { gl } from './WebGL';
import { Buffer } from './Buffer';
import { Shader } from './Shader';

import * as TextureShader from '../shaders/Texture';
import { mat4, glMatrix } from 'gl-matrix';

const load = require('@loaders.gl/core').load;
const GLTFLoader = require('@loaders.gl/gltf').GLTFLoader;

class Node {
    name: string;
    shader: Shader = new Shader(TextureShader.vertexSource, TextureShader.fragmentSource);

    transform: mat4 = mat4.create();

    vao: WebGLVertexArrayObject = gl.createVertexArray();
    texture: WebGLTexture;
    indices: number;
}

export class Entity {
    private _nodes: Array<Node> = [];
    private _shader = new Shader(TextureShader.vertexSource, TextureShader.fragmentSource);
    private _pMatrix = mat4.create();
    private _built = false;

    constructor(url: string) {
        this.initialize(url);
    }

    private async initialize(url: string) {
        const gltf = await load(url, GLTFLoader, {
            parserVersion: 2,
            postProcess: true,
        });

        console.log(gltf);

        this.parseNodes(gltf.scene.nodes, document.getElementById('crate'));
        this._built = true;
    }

    private parseNodes(objects, image) {
        for (const object of objects) {
            const node = new Node();
            node.name = (Math.random() * 100).toString();
            this._nodes.push(node);
            this._shader.use();

            const mesh = object.mesh;
            const rotation = object.rotation || [0, 0, 0, 1];
            const translation = object.translation || [0, 0, 0];
            const scale = object.scale || [1, 1, 1];

            node.vao = gl.createVertexArray();
            gl.bindVertexArray(node.vao);
            gl.enableVertexAttribArray(0);
            gl.enableVertexAttribArray(1);
            gl.enableVertexAttribArray(2);

            const vertices = mesh.primitives[0].attributes.POSITION;
            gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
            gl.bufferData(gl.ARRAY_BUFFER, vertices.value, gl.STATIC_DRAW);

            const normals = mesh.primitives[0].attributes.NORMAL;
            gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
            gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
            gl.bufferData(gl.ARRAY_BUFFER, normals.value, gl.STATIC_DRAW);

            const texcoords = mesh.primitives[0].attributes.TEXCOORD_0;
            gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
            gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
            gl.bufferData(gl.ARRAY_BUFFER, texcoords.value, gl.STATIC_DRAW);
            
            node.texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, node.texture);
            //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image as TexImageSource);
            gl.bindTexture(gl.TEXTURE_2D, null);

            mat4.fromRotationTranslationScale(node.transform, rotation, translation, scale);

            const indices = mesh.primitives[0].indices;
            node.indices = indices.count;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices.value, gl.STATIC_DRAW);
        }
    }

    public setProjectionMatrix(projectionMatrix: mat4) {
        this._pMatrix = projectionMatrix;
        if (this._built) {
            //gl.uniformMatrix4fv(this._shader.getUniformLocation('umProjection'), false, this._pMatrix);
        }
    }

    public draw(worldMatrix) {
        if (!this._built) {
            return;
        }

        this._shader.use();

        let matrix = mat4.create();
        const matrixStack = [];

        mat4.copy(matrix, worldMatrix);

        for (const node of this._nodes) {
            matrixStack.push(mat4.clone(matrix));
            mat4.mul(matrix, matrix, node.transform);

            gl.bindVertexArray(node.vao);
            gl.uniformMatrix4fv(this._shader.getUniformLocation('umProjection'), false, this._pMatrix);
            gl.uniformMatrix4fv(this._shader.getUniformLocation('umView'), false, matrix);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this._nodes[0].texture);
            gl.drawElements(gl.TRIANGLES, node.indices, gl.UNSIGNED_SHORT, 0);

            matrix = matrixStack.pop();
        }
    }
}