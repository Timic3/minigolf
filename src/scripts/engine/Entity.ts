import { gl } from './utils/WebGL';
import { Shader } from './utils/Shader';

import { mat4 } from 'gl-matrix';
import { Primitive } from './utils/Primitive';

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
    private _built = false;

    private _viewMatrix = mat4.create();

    private _ballPositions: any = [-5, -5, -5];
    private _ballRotations: any = [0, 0, 0, 1];

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
                    if (node.name.includes('deska')) {
                        // Small optimisation
                        engine.generateConvexCollision(translation, rotation, scale, mesh.getVertices());
                    } else if (node.name !== 'Golf_zogica') {
                        if (node.name.substring(0, 6) === 'Luknja') {
                            engine.generateConcaveCollision(
                                translation,
                                rotation,
                                scale,
                                mesh.getVertices(),
                                mesh.getIndices(),
                                +node.name.replace('Luknja', ''));
                        } else {
                            engine.generateConcaveCollision(
                                translation,
                                rotation,
                                scale,
                                mesh.getVertices(),
                                mesh.getIndices()
                            );
                        }
                    }
                    node.primitives.push(mesh);
                }
            }

            mat4.fromRotationTranslationScale(node.transform, rotation, translation, scale);
        }
    }

    public update(ballPositions, ballRotations) {
        if (!this._built) {
            return;
        }

        this._ballPositions = ballPositions;
        this._ballRotations = ballRotations;
    }

    public draw(projectionMatrix, worldMatrix, cameraPosition) {
        if (!this._built) {
            return;
        }

        const matrixStack = [];

        mat4.copy(this._viewMatrix, worldMatrix);

        for (const node of this._nodes) {
            matrixStack.push(mat4.clone(this._viewMatrix));

            if (node.name === 'Golf_zogica') {
                mat4.fromRotationTranslationScale(
                    node.transform,
                    this._ballRotations,
                    this._ballPositions,
                    [0.07023785263299942, 0.07023785263299942, 0.07023785263299942]
                );
            }
            mat4.mul(this._viewMatrix, this._viewMatrix, node.transform);

            for (const primitive of node.primitives) {
                primitive.draw(projectionMatrix, this._viewMatrix, node.transform, cameraPosition);
            }

            this._viewMatrix = matrixStack.pop();
        }
    }
}