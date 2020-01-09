import { gl } from './WebGL';
import { Shader } from './Shader';

import * as TextureShader from '../shaders/Texture';
import * as BasicShader from '../shaders/Basic';
import { mat4, glMatrix, vec3, quat, vec4 } from 'gl-matrix';
import { Primitive } from './Primitive';
import { Engine } from '../Engine';
import * as CANNON from 'cannon';

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
    static vertices: Float32Array;
    static indices: Uint16Array;
    private _nodes: Array<Node> = [];
    private _shader = new Shader(TextureShader.vertexSource, TextureShader.fragmentSource);
    private _shader2 = new Shader(BasicShader.vertexSource, BasicShader.fragmentSource);
    private _pMatrix = mat4.create();
    private _built = false;

    /*constructor(url: string) {
        this.initialize(url);
    }*/

    public async initialize(url: string, engine) {
        const gltf = await load(url, GLTFLoader, {
            parserVersion: 2,
            postProcess: true,
        });

        console.log(gltf);

        this.parseNodes(gltf.scene.nodes, engine);
        this._built = true;
    }

    private parseNodes(objects, engine) {
        for (const object of objects) {
            const node = new Node();
            node.name = object.name;
            this._nodes.push(node);

            const rotation = object.rotation || [0, 0, 0, 1];
            const translation = object.translation || [0, 0, 0];
            const scale = object.scale || [1, 1, 1];

            const mesh = object.mesh;
            if (mesh && mesh.primitives) {
                for (const primitive of mesh.primitives) {
                    const mesh = new Primitive(primitive);
                    engine.generateCollision(translation, rotation, scale, mesh.getVertices(), mesh.getIndices());
                    node.primitives.push(mesh);
                }
            }

            mat4.fromRotationTranslationScale(node.transform, rotation, translation, scale);
        }
    }

    public setProjectionMatrix(projectionMatrix: mat4) {
        this._pMatrix = projectionMatrix;
    }

    public draw(worldMatrix, cameraPosition) {
        if (!this._built) {
            return;
        }

        let matrix = mat4.create();
        const matrixStack = [];

        mat4.copy(matrix, worldMatrix);

        for (const node of this._nodes) {
            matrixStack.push(mat4.clone(matrix));

            if (node.name === 'Golf_zogica') {
                //mat4.translate(node.transform, node.transform, vec3.fromValues(Engine.TEMP_X, Engine.TEMP_Y, Engine.TEMP_Z));
                mat4.fromRotationTranslationScale(
                    node.transform,
                    quat.fromValues(Engine.ROTATION[0], Engine.ROTATION[1], Engine.ROTATION[2], Engine.ROTATION[3]),
                    vec3.fromValues(Engine.POSITION[0], Engine.POSITION[1], Engine.POSITION[2]),
                    [0.07, 0.07, 0.07]
                );
                //mat4.getTranslation(orbit.center, node.transform);
            }
            mat4.mul(matrix, matrix, node.transform);

            for (const primitive of node.primitives) {
                primitive.draw(this._pMatrix, matrix, node.transform, cameraPosition);
            }

            matrix = matrixStack.pop();
        }
    }
}