import { WebGL, gl } from './utils/WebGL';

import { mat4, glMatrix } from 'gl-matrix';
import { Entity } from './Entity';
import { UI } from './utils/UI';
import { Levels } from './Levels';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const controls = require('orbit-controls')();

let Ammo: any;

export class Engine {
    static TIME_STEP = 1.0 / 60.0;
    static RUNNING = false;

    private _canvas: HTMLCanvasElement;

    private _scene: Entity;
    private _sphere;

    private _pMatrix: mat4 = mat4.create();
    private _wMatrix: mat4 = mat4.identity(mat4.create());

    private _physicsWorld;
    private _currentTransformation;


    public constructor(elementId: string) {
        this._canvas = WebGL.initialize(elementId);

        this.resize = this.resize.bind(this);
        this.keypress = this.keypress.bind(this);
        this.keyup = this.keyup.bind(this);
        this.keydown = this.keydown.bind(this);
        window.onresize = this.resize;
        window.onkeypress = this.keypress;
        window.onkeyup = this.keyup;
        window.onkeydown = this.keydown;

        controls.distanceBounds = [1.5, 15];
        controls.phiBounds = [0.001, Math.PI / 2];
        controls.zoomSpeed = 0.001;

        controls.position = [-100, 10, 80];

        this.resize();
    }

    private initPhysics() {
        const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
        const broadphase = new Ammo.btDbvtBroadphase();
        const solver = new Ammo.btSequentialImpulseConstraintSolver();
        this._physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
        this._physicsWorld.setGravity(new Ammo.btVector3(0, -9.82, 0));
    }

    public async start(ammo) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.frontFace(gl.CCW);
        gl.cullFace(gl.BACK);

        Ammo = ammo;
        this._currentTransformation = new Ammo.btTransform();

        this.initPhysics();

        UI.flow('loading', 'Scene and collisions');
        this._scene = new Entity();
        await this._scene.initialize("assets/golf_court.glb", this);
        //this._ball = new Entity();
        //await this._scene.initialize("assets/ball.glb", this);

        this.generateBallCollision();

        mat4.perspective(this._pMatrix, glMatrix.toRadian(45), window.innerWidth / window.innerHeight, 0.1, 1000.0);

        UI.screen('menu');

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    public generateConcaveCollision(position, rotation, scale, vertices, indices) {
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(position[0], position[1], position[2]));
        transform.setRotation(new Ammo.btQuaternion(rotation[0], rotation[1], rotation[2], rotation[3]));
        const motionState = new Ammo.btDefaultMotionState(transform);

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
        const localInertia = new Ammo.btVector3(0, 0, 0);

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, shape, localInertia);
        const object = new Ammo.btRigidBody(rbInfo);
        //object.setRestitution(5);
        object.setFriction(1);
        object.setRollingFriction(0.1);

        this._physicsWorld.addRigidBody(object);
    }

    public generateConvexCollision(position, rotation, scale, vertices) {
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(position[0], position[1], position[2]));
        transform.setRotation(new Ammo.btQuaternion(rotation[0], rotation[1], rotation[2], rotation[3]));
        const motionState = new Ammo.btDefaultMotionState(transform);

        const shape = new Ammo.btConvexHullShape();
        shape.setLocalScaling(new Ammo.btVector3(scale[0], scale[1], scale[2]));
        for (let i = 0; i < vertices.length / 3; i++) {
            shape.addPoint(new Ammo.btVector3(vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]));
        }
        shape.setMargin(0);

        const localInertia = new Ammo.btVector3(0, 0, 0);

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, shape, localInertia);
        const object = new Ammo.btRigidBody(rbInfo);
        //object.setRestitution(5);
        object.setFriction(1);
        object.setRollingFriction(0.1);

        this._physicsWorld.addRigidBody(object);
    }

    private generateBallCollision() {
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(Levels.ALL[3].spawnpoint[0], Levels.ALL[3].spawnpoint[1], Levels.ALL[3].spawnpoint[2]));
        transform.setRotation(new Ammo.btQuaternion(0, 0, 0, 1));
        const motionState = new Ammo.btDefaultMotionState(transform);

        const colShape = new Ammo.btSphereShape(0.07023785263299942);
        colShape.setMargin(1);

        const localInertia = new Ammo.btVector3(0, 0, 0);
        colShape.calculateLocalInertia(0.046, localInertia);

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(0.046, motionState, colShape, localInertia);
        this._sphere = new Ammo.btRigidBody(rbInfo);
        this._sphere.setCcdMotionThreshold(0.05);
        this._sphere.setCcdSweptSphereRadius(0.06);
        
        //this._sphere.setRestitution(1);
        this._sphere.setFriction(0.2);
        this._sphere.setRollingFriction(0.1);

        this._physicsWorld.addRigidBody(this._sphere);
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
        if (!this._sphere.isActive()) {
            this._sphere.activate();
        }
        if (e.code === 'KeyS') {
            this._sphere.setLinearVelocity(new Ammo.btVector3(controls.direction[0] * 5, 0, controls.direction[2] * 5));
        } else if (e.code === 'Space') {
            this._sphere.setLinearVelocity(new Ammo.btVector3(0, 5, 0));
        } else if (e.code === 'KeyR') {
            this._sphere.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
            this._sphere.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
        } else if (e.code === 'KeyF') {
            console.log(controls.target);
        }
    }

    private keyup(e) {
        
    }

    private keydown(e) {

    }

    private loop(time) {
        // Clear the color buffer of the screen, otherwise we draw each frame on top of each other.
        gl.clearColor(0.37, 0.94, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if (Engine.RUNNING) {
            this._physicsWorld.stepSimulation(Engine.TIME_STEP, 2);

            const motionState = this._sphere.getMotionState();
            if (motionState) {
                motionState.getWorldTransform(this._currentTransformation);
                const p = this._currentTransformation.getOrigin();
                const r = this._currentTransformation.getRotation();
                controls.target = [p.x(), p.y(), p.z()];
                this._scene.update(controls.target, [r.x(), r.y(), r.z(), r.w()]);
            }

            controls.update();
        } else {
            if (controls.position[0] > -216) { // -216.25000000001847, 10, -36.24999999999767
                controls.position[0] -= 0.01;
                controls.position[2] -= 0.01;
            }
        }

        mat4.lookAt(this._wMatrix, controls.position, controls.target, controls.up);

        this._scene.draw(this._pMatrix, this._wMatrix, controls.position);

        requestAnimationFrame(this.loop);
    }
}