import { WebGL, gl } from './utils/WebGL';

import { mat4, glMatrix } from 'gl-matrix';
import { Entity } from './utils/Entity';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const controls = require('orbit-controls')();

let Ammo: any;

export class Engine {
    static TIME_STEP = 1.0 / 60.0;
    static POSITION = [];
    static ROTATION = [];

    private _canvas: HTMLCanvasElement;

    private _scene: Entity;
    private _ball;

    private _pMatrix: mat4 = mat4.create();
    private _vMatrix: mat4 = mat4.identity(mat4.create());
    private _wMatrix: mat4 = mat4.identity(mat4.create());

    //private _orbitalController = new OrbitalCamera(this._wMatrix);

    private _lastTime;

    private _physicsWorld;
    private _currentTransformation;

    public constructor(elementId: string) {
        this._canvas = WebGL.initialize(elementId);

        this.keypress = this.keypress.bind(this);
        this.resize = this.resize.bind(this);
        window.onresize = this.resize;
        window.onkeypress = this.keypress;

        controls.distanceBounds = [1.5, 15];
        controls.phiBounds = [0.001, Math.PI / 2];
        controls.zoomSpeed = 0.001;

        this.resize();
    }

    private async initPhysics() {
        const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
        const broadphase = new Ammo.btDbvtBroadphase();
        const solver = new Ammo.btSequentialImpulseConstraintSolver();
        this._physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
        this._physicsWorld.setGravity(new Ammo.btVector3(0, -9.82, 0));
    }

    public async start(ammo) {
        gl.clearColor(0.5, 0.5, 0.5, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST); // Draw nearest vertices first
        //gl.enable(gl.CULL_FACE); // Rasterizer, despite depth test, still checks behind these vertices - culling prevents that
        gl.frontFace(gl.CCW); // Vertices are appearing counter-clockwise
        gl.cullFace(gl.BACK); // Get rid of the back side

        Ammo = ammo;
        this._currentTransformation = new Ammo.btTransform();

        await this.initPhysics();

        this._scene = new Entity();
        await this._scene.initialize("assets/golf_court.glb", this);
        //this._ball = new Entity("assets/ball.glb");

        this.generateBall();
        //this.generateTerrain();
        //this.generateObjects();
        

        /*this._ballP = new CANNON.Body({
            mass: 0.0459, // kg
            position: new CANNON.Vec3(0, 10, 0), // m
            shape: new CANNON.Sphere(0.07)
        });
        this._world.addBody(this._ballP);*/

        //const groundShape = new CANNON.Plane();
        //groundBody.addShape(groundShape);

        //const shape = new CANNON.ConvexPolyhedron(Entity.vertices, Entity.indices);
        //groundBody.addShape(shape);
        //this._world.addBody(groundBody);

        mat4.perspective(this._pMatrix, glMatrix.toRadian(45), window.innerWidth / window.innerHeight, 0.1, 1000.0);

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    public generateCollision(position, rotation, scale, vertices, indices) {
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(position[0], position[1], position[2]));
        transform.setRotation(new Ammo.btQuaternion(rotation[0], rotation[1], rotation[2], rotation[3]));
        const motionState = new Ammo.btDefaultMotionState(transform);

        //const shape = new Ammo.btConvexHullShape();
        //shape.setLocalScaling(new Ammo.btVector3(scale[0], scale[1], scale[2]));
        /*for (let i = 0; i < vertices.length / 3; i++) {
            shape.addPoint(new Ammo.btVector3(vertices[i * 3] * scale[0], vertices[i * 3 + 1] * scale[1], vertices[i * 3 + 2] * scale[2]));
        }*/
        
        /*for (let i = 0; i * 3 < indices.length; i++) {
            const a = indices[i * 3 + 0];
            const b = indices[i * 3 + 1];
            const c = indices[i * 3 + 2];
            shape.addPoint(new Ammo.btVector3(vertices[a * 3 + 0], vertices[a * 3 + 1], vertices[a * 3 + 2]));
            shape.addPoint(new Ammo.btVector3(vertices[b * 3 + 0], vertices[b * 3 + 1], vertices[b * 3 + 2]));
            shape.addPoint(new Ammo.btVector3(vertices[c * 3 + 0], vertices[c * 3 + 1], vertices[c * 3 + 2]));
        }*/

        const mesh = new Ammo.btTriangleMesh;
        mesh.setScaling(new Ammo.btVector3(scale[0], scale[1], scale[2]));
        for (let i = 0; i * 3 < indices.length; i++) {
            const a = indices[i * 3 + 0];
            const b = indices[i * 3 + 1];
            const c = indices[i * 3 + 2];
            mesh.addTriangle(
                new Ammo.btVector3(vertices[a * 3 + 0], vertices[a * 3 + 1], vertices[a * 3 + 2]),
                new Ammo.btVector3(vertices[b * 3 + 0], vertices[b * 3 + 1], vertices[b * 3 + 2]),
                new Ammo.btVector3(vertices[c * 3 + 0], vertices[c * 3 + 1], vertices[c * 3 + 2]),
                false
            );
        }

        const shape = new Ammo.btBvhTriangleMeshShape(mesh, true, true);

        const localInertia = new Ammo.btVector3( 0, 0, 0 );

        const rbInfo = new Ammo.btRigidBodyConstructionInfo( 0, motionState, shape, localInertia );
        const object = new Ammo.btRigidBody( rbInfo );
        object.setCcdMotionThreshold(1);


        this._physicsWorld.addRigidBody( object );
    }

    private generateObjects() {
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin( new Ammo.btVector3( -1.1726552248001099, 2.6692488193511963, 0 ) );
        transform.setRotation( new Ammo.btQuaternion( 0.5, -0.5, 0.5, 0.4999999701976776 ) );
        //transform.setOrigin(new Ammo.btVector3(0, 0, 0));
        //transform.setRotation(new Ammo.btQuaternion(0, 0, 0, 1));
        const motionState = new Ammo.btDefaultMotionState( transform );

        /*rotation: (4) [0.5, 0.5000000596046448, -0.5, 0.4999999403953552]
scale: (3) [8.704970359802246, 0.1428428292274475, 0.09669702500104904]
translation: (3) [-0.2918739318847656, 0.07751580327749252, -7.47216796875]*/
/*rotation: (4) [0.5, -0.5, 0.5, 0.4999999701976776]
scale: (3) [0.15933185815811157, 1.1706310510635376, 0.15933185815811157]
translation: (3) [-1.1726552248001099, 2.6692488193511963, 0]*/

        const vertices = Entity.vertices;
        const indices = Entity.indices;
        console.log(vertices, indices);
        const scale = [0.15933185815811157, 1.1706310510635376, 0.15933185815811157]

        const colShape = new Ammo.btConvexHullShape();
        /*for (let i = 0; i < vertices.length / 3; i++) {
            colShape.addPoint(new Ammo.btVector3(vertices[i * 3] * scale[0], vertices[i * 3 + 1] * scale[1], vertices[i * 3 + 2] * scale[2]));
        }*/
        
        for (let i = 0; i * 3 < indices.length; i++) {
            colShape.addPoint(new Ammo.btVector3(vertices[indices[i * 3]] * scale[0], vertices[indices[i * 3] + 1] * scale[1], vertices[indices[i * 3] + 2] * scale[2]));
            colShape.addPoint(new Ammo.btVector3(vertices[indices[i * 3 + 1]] * scale[0], vertices[indices[i * 3 + 1] + 1] * scale[1], vertices[indices[i * 3 + 1] + 2] * scale[2]));
            colShape.addPoint(new Ammo.btVector3(vertices[indices[i * 3 + 2]] * scale[0], vertices[indices[i * 3 + 2] + 1] * scale[1], vertices[indices[i * 3 + 2] + 2] * scale[2]));
        }
        /*const mesh = new Ammo.btTriangleMesh(true, true);
        for (let i = 0; i * 3 < indices.length; i++) {
            mesh.addTriangle(
                new Ammo.btVector3(vertices[indices[i * 3]] * scale[0], vertices[indices[i * 3] + 1] * scale[1], vertices[indices[i * 3] + 2] * scale[2]),
                new Ammo.btVector3(vertices[indices[i * 3 + 1]] * scale[0], vertices[indices[i * 3 + 1] + 1] * scale[1], vertices[indices[i * 3 + 1] + 2] * scale[2]),
                new Ammo.btVector3(vertices[indices[i * 3 + 2]] * scale[0], vertices[indices[i * 3 + 2] + 1] * scale[1], vertices[indices[i * 3 + 2] + 2] * scale[2]),
                false
            );
        }*/
        //const colShape = new Ammo.btBvhTriangleMeshShape(mesh, true, true);
        //colShape.setLocalScaling(0, 0, 0);

        const localInertia = new Ammo.btVector3( 0, 0, 0 );
        //colShape.calculateLocalInertia( 0, localInertia );

        const rbInfo = new Ammo.btRigidBodyConstructionInfo( 0, motionState, colShape, localInertia );
        const terrain = new Ammo.btRigidBody( rbInfo );


        this._physicsWorld.addRigidBody( terrain );
    }

    private generateTerrain() {
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin( new Ammo.btVector3( 0, 0, 0 ) );
        transform.setRotation( new Ammo.btQuaternion( 0, 0, 0, 1 ) );
        const motionState = new Ammo.btDefaultMotionState( transform );

        //const vertices = Entity.vertices;
        //const indices = Entity.indices;
        //console.log(vertices, indices);

        /*const mesh = new Ammo.btTriangleMesh(true, true);
        for (let i = 0; i * 3 < indices.length; i++) {
            mesh.addTriangle(
                //268.9696044921875, 268.9696044921875, 268.9696044921875
                new Ammo.btVector3(vertices[indices[i * 3]], vertices[indices[i * 3] + 1], vertices[indices[i * 3] + 2]),
                new Ammo.btVector3(vertices[indices[i * 3 + 1]], vertices[indices[i * 3 + 1] + 1], vertices[indices[i * 3 + 1] + 2]),
                new Ammo.btVector3(vertices[indices[i * 3 + 2]], vertices[indices[i * 3 + 2] + 1], vertices[indices[i * 3 + 2] + 2]),
                false
            );
            //mesh.addTriangle(vertices[indices[i * 3]], vertices[indices[i * 3 + 1]], vertices[indices[i * 3 + 2]])
        }*/
        //const colShape = new Ammo.btBvhTriangleMeshShape(mesh, true, true);
        //colShape.setLocalScaling(new Ammo.btVector3(268.9696044921875, 268.9696044921875, 268.9696044921875));
        /*const colShape = new Ammo.btConvexHullShape();
        for (let i = 0; i < vertices.length / 3; i++) {
            colShape.addPoint(new Ammo.btVector3(vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]));
        }*/

        const colShape = new Ammo.btStaticPlaneShape(new Ammo.btVector3(0, 1, 0), 0 );

        const localInertia = new Ammo.btVector3( 0, 0, 0 );
        //colShape.calculateLocalInertia( 0, localInertia );

        const rbInfo = new Ammo.btRigidBodyConstructionInfo( 0, motionState, colShape, localInertia );
        const terrain = new Ammo.btRigidBody( rbInfo );


        this._physicsWorld.addRigidBody( terrain );
    }

    private generateBall() {
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        //this._orbitalController.center = vec3.fromValues(0, 20, 0);
        transform.setOrigin( new Ammo.btVector3( -0.7, 1, 0.9 ) );
        transform.setRotation( new Ammo.btQuaternion( 0, 0, 0, 1 ) );
        const motionState = new Ammo.btDefaultMotionState( transform );

        const colShape = new Ammo.btSphereShape( 0.07 );
        colShape.setMargin( 0 );

        const localInertia = new Ammo.btVector3( 0, 0, 0 );
        colShape.calculateLocalInertia( 0.046, localInertia );

        const rbInfo = new Ammo.btRigidBodyConstructionInfo( 0.046, motionState, colShape, localInertia );
        this._ball = new Ammo.btRigidBody( rbInfo );
        this._ball.setCcdSweptSphereRadius(0.2);

        this._physicsWorld.addRigidBody( this._ball );
    }

    private resize() {
        if (this._canvas !== undefined) {
            this._canvas.width = window.innerWidth;
            this._canvas.height = window.innerHeight;
            gl.viewport(0, 0, this._canvas.width, this._canvas.height);
            mat4.perspective(this._pMatrix, glMatrix.toRadian(45), this._canvas.width / this._canvas.height, 0.1, 1000.0);
        }
    }

    private keypress(e) {
        //console.log(e)
        if (e.code === 'KeyS') {
            this._ball.applyCentralForce(new Ammo.btVector3(controls.direction[0], 0, controls.direction[2]));
        } else if (e.code === 'Space') {
            this._ball.applyCentralForce(new Ammo.btVector3(0, 5, 0));
        } else if (e.code === 'KeyR') {
            this._ball.applyCentralForce(new Ammo.btVector3(0, 0, 0));
        }
    }

    private loop(time) {
        // Clear the color buffer of the screen, otherwise we draw each frame on top of each other.
        gl.clearColor(94 / 255, 240 / 255, 254 / 255, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if (this._lastTime !== undefined) {
            //this._world.step(Engine.TIME_STEP, (time - this._lastTime) / 1000, 3);
            this._physicsWorld.stepSimulation(1 / 60, 3);
        }

        const motionState = this._ball.getMotionState();
        if (motionState) {
            motionState.getWorldTransform(this._currentTransformation);
            const p = this._currentTransformation.getOrigin();
            Engine.POSITION = [p.x(), p.y(), p.z()];
            const r = this._currentTransformation.getRotation();
            Engine.ROTATION = [r.x(), r.y(), r.z(), r.w()];
            controls.target = Engine.POSITION;
            //vec3.copy(this._orbitalController.up, Engine.POSITION);
        }
        //console.log(Engine.TEMP_Y, Engine.TEMP_X, Engine.TEMP_Z);

        //this._ball.draw(this._wMatrix, this._orbitalController._vec, this._orbitalController);

        //this._orbitalController.update();
        controls.update();
        mat4.lookAt(this._wMatrix, controls.position, controls.target, controls.up);

        this._scene.setProjectionMatrix(this._pMatrix);
        this._scene.draw(this._wMatrix, controls.position);

        this._lastTime = time;
        requestAnimationFrame(this.loop);
    }
}