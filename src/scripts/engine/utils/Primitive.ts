import { gl } from "./WebGL";
import { Shader } from "./Shader";

import * as BasicShader from '../shaders/Basic';

export class Primitive {
    private _vao: WebGLVertexArrayObject;
    private _shader: Shader;
    private _indicesSize: number;

    private _vertices: Float32Array;
    private _indices: Uint16Array;

    private _doubleSided = false;
    private _alphaMode = 'OPAQUE';
    
    constructor(primitive: any) {
        const vertices = primitive.attributes.POSITION;
        const normals = primitive.attributes.NORMAL;
        const texcoords = primitive.attributes.TEXCOORD_0;
        const colors = primitive.attributes.COLOR_0;
        const indices = primitive.indices;
        const material = primitive.material;

        this._vertices = vertices.value;
        this._indices = indices.value;
        
        this._shader = new Shader(BasicShader.vertexSource, BasicShader.fragmentSource);
        if (material) {
            this._shader.define('HAS_MATERIALS');
            this._shader.define('MATERIAL_METALLICROUGHNESS');
            //this._shader.define('MATERIAL_METALLICROUGHNESS');
            //this._shader.define('USE_IBL');
        }

        //if (colors) {
        //} else if (material) {
        //    this._shader = new Shader(MetallicRoughnessShader.vertexSource, MetallicRoughnessShader.fragmentSource);
        //} else {
         //   this._shader = new Shader(TextureShader.vertexSource, TextureShader.fragmentSource);
        //}
        //this._shader.use();
        /*-0.9243900179862976, -0.3468450903892517, 0.15875054895877838*/
        
        this._vao = gl.createVertexArray();
        gl.bindVertexArray(this._vao);

        // Position
        gl.enableVertexAttribArray(0);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.bufferData(gl.ARRAY_BUFFER, vertices.value, gl.STATIC_DRAW);

        // Normals
        this._shader.define('HAS_NORMALS');
        gl.enableVertexAttribArray(1);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
        gl.bufferData(gl.ARRAY_BUFFER, normals.value, gl.STATIC_DRAW);

        // Texture coordinates
        if (texcoords) {
            this._shader.define('HAS_TEXCOORDS');
            gl.enableVertexAttribArray(2);
            gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
            gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
            gl.bufferData(gl.ARRAY_BUFFER, texcoords.value, gl.STATIC_DRAW);
        }

        // Colors
        if (colors) {
            this._shader.define('HAS_COLORS');
            gl.enableVertexAttribArray(3);
            gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
            gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 0, 0);
            gl.bufferData(gl.ARRAY_BUFFER, colors.value, gl.STATIC_DRAW);
        }

        /*node.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, node.texture);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image as TexImageSource);
        gl.bindTexture(gl.TEXTURE_2D, null);*/

        // Indices
        this._indicesSize = indices.count;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices.value, gl.STATIC_DRAW);

        if (material && material.alphaMode === 'BLEND') { // It's water
            this._shader.define('IS_WATER');
            this._shader.define('ALPHAMODE_BLEND');
        }

        this._shader.build();
        this._shader.use();

        if (material) {
            this._doubleSided = material.doubleSided;
            this._alphaMode = material.alphaMode;

            const metallicRoughness = material.pbrMetallicRoughness;
            if (metallicRoughness.baseColorFactor) {
                gl.uniform4f(
                    this._shader.getUniformLocation('uBaseColorFactor'),
                    metallicRoughness.baseColorFactor[0],
                    metallicRoughness.baseColorFactor[1],
                    metallicRoughness.baseColorFactor[2],
                    metallicRoughness.baseColorFactor[3]
                );
            } else {
                gl.uniform4f(
                    this._shader.getUniformLocation('uBaseColorFactor'),
                    1, 1, 1, 1
                );
            }
            gl.uniform1f(this._shader.getUniformLocation('uMetallicFactor'), metallicRoughness.metallicFactor);
            gl.uniform1f(this._shader.getUniformLocation('uRoughnessFactor'), metallicRoughness.roughnessFactor);
        }
    }

    public getVertices() {
        return this._vertices;
    }

    public getIndices() {
        return this._indices;
    }

    draw(projectionMatrix, viewMatrix, modelMatrix, cameraPosition) {
        this._shader.use();

        if (this._doubleSided) {
            gl.disable(gl.CULL_FACE);
        } else {
            gl.enable(gl.CULL_FACE);
        }

        if (this._alphaMode === 'BLEND') {
            gl.enable(gl.BLEND);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.blendEquation(gl.FUNC_ADD);
        } else {
            gl.disable(gl.BLEND);
        }

        gl.bindVertexArray(this._vao);
        gl.uniformMatrix4fv(this._shader.getUniformLocation('uProjection'), false, projectionMatrix);
        gl.uniformMatrix4fv(this._shader.getUniformLocation('uView'), false, viewMatrix);
        gl.uniformMatrix4fv(this._shader.getUniformLocation('uModel'), false, modelMatrix);
        gl.uniform3f(this._shader.getUniformLocation('uCamera'), cameraPosition[0], cameraPosition[1], cameraPosition[2]);
        
        //gl.uniform3f(this._shader.getUniformLocation('u_LightDirection'), 78.45500946044922, -53.05121612548828, -383.6159973144531); // 246.43983459472656, -286.65008544921875, -115.0217056274414
        //gl.uniform3f(this._shader.getUniformLocation('u_LightColor'), 1, 0.5699955821037292, 0.2395770400762558);
        //gl.uniform3f(this._shader.getUniformLocation('u_LightColor'), 1, 0.5699955821037292, 0.2395770400762558);
        //gl.uniform3f(this._shader.getUniformLocation('u_AmbientLightColor'), 1, 1, 1);
        //gl.uniform1f(this._shader.getUniformLocation('u_AmbientLightIntensity'), 10);
        

        //gl.activeTexture(gl.TEXTURE0);
        //gl.bindTexture(gl.TEXTURE_2D, this._nodes[0].texture);
        gl.drawElements(gl.TRIANGLES, this._indicesSize, gl.UNSIGNED_SHORT, 0);
        //gl.drawArrays(gl.LINE_STRIP, 0, this._vertices.length / 3);
    }
}