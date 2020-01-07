import { gl } from './WebGL';
import { Buffer } from './Buffer';
import { Shader } from './Shader';

import * as TextureShader from '../shaders/Texture';
import * as BasicShader from '../shaders/Basic';
import { mat4, glMatrix, vec3, quat } from 'gl-matrix';
import { Primitive } from './Primitive';

const load = require('@loaders.gl/core').load;
const GLTFLoader = require('@loaders.gl/gltf').GLTFLoader;

class Node {
    name: string;
    shader: Shader;

    transform: mat4 = mat4.create();

    vao: WebGLVertexArrayObject = gl.createVertexArray();
    texture: WebGLTexture;
    indices: number;
    primitives: Array<Primitive> = [];

    doubleSided = false;
}

export class Entity {
    private _nodes: Array<Node> = [];
    private _shader = new Shader(TextureShader.vertexSource, TextureShader.fragmentSource);
    private _shader2 = new Shader(BasicShader.vertexSource, BasicShader.fragmentSource);
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
            node.name = object.name;
            this._nodes.push(node);

            const mesh = object.mesh;
            if (mesh && mesh.primitives) {
                for (const primitive of mesh.primitives) {
                    node.primitives.push(new Primitive(primitive));
                }
            }

            const rotation = object.rotation || [0, 0, 0, 1];
            const translation = object.translation || [0, 0, 0];
            const scale = object.scale || [1, 1, 1];

            mat4.fromRotationTranslationScale(node.transform, rotation, translation, scale);
        }
    }

    public setProjectionMatrix(projectionMatrix: mat4) {
        this._pMatrix = projectionMatrix;
    }

    public draw(worldMatrix, cameraPosition, orbit) {
        if (!this._built) {
            return;
        }

        let matrix = mat4.create();
        const matrixStack = [];

        mat4.copy(matrix, worldMatrix);

        for (const node of this._nodes) {
            matrixStack.push(mat4.clone(matrix));
            mat4.mul(matrix, matrix, node.transform);

            if (node.name === 'Golf_zogica') {
                mat4.translate(node.transform, node.transform, vec3.fromValues(0, 0, 1));
                //mat4.getTranslation(orbit.center, node.transform);
            }

            for (const primitive of node.primitives) {
                primitive.draw(this._pMatrix, matrix, node.transform, cameraPosition);
            }

            matrix = matrixStack.pop();
        }
    }
}