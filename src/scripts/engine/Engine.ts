import { WebGL, gl } from './utils/WebGL';

import { mat4, glMatrix } from 'gl-matrix';
import { Entity } from './Entity';
import { UI } from './utils/UI';
import { Levels } from './Levels';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const controls = require('orbit-controls')();

let Ammo: any;

enum State {
    WAITING, MOVING, READY, SHOOTING, FINISHING
}

export class Engine {
    static TIME_STEP = 1.0 / 60.0;
    static MAX_FORCE = 50;

    private _running = false;

    private _canvas: HTMLCanvasElement;

    private _scene: Entity;
    private _sphere;

    private _pMatrix: mat4 = mat4.create();
    private _wMatrix: mat4 = mat4.identity(mat4.create());

    private _physicsWorld;
    private _transformCache;
    private _vectorCache;

    private _state = State.WAITING;

    private _currentForce = 0;
    private _forceDelta = 0.01;

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

        controls.position = [-100, 20, 80];

        this.resize();
    }

    private initPhysics() {
        const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
        const broadphase = new Ammo.btDbvtBroadphase();
        const solver = new Ammo.btSequentialImpulseConstraintSolver();
        this._physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
        this._physicsWorld.setGravity(new Ammo.btVector3(0, -9.82, 0));

        this._vectorCache = [new Ammo.btVector3(), new Ammo.btVector3(), new Ammo.btVector3()];
        this._transformCache = [new Ammo.btTransform(), new Ammo.btTransform()];
    }

    public async start(ammo) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.frontFace(gl.CCW);
        gl.cullFace(gl.BACK);

        Ammo = ammo;

        this.initPhysics();

        UI.flow('loading', 'Scene and collisions');
        console.time('Scene and collisions');
        this._scene = new Entity();
        await this._scene.initialize("assets/golf_court.glb", this);

        this.generateBallCollision();
        console.timeEnd('Scene and collisions');

        mat4.perspective(this._pMatrix, glMatrix.toRadian(45), window.innerWidth / window.innerHeight, 0.1, 1000.0);

        UI.screen('menu');

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    public run() {
        this._running = true;
        this.prepareLevel();

        // Running out of time, maybe later
        UI.dialog('Hold S to shoot or press R to reset.', 1, undefined);
    }

    public generateConcaveCollision(position, rotation, scale, vertices, indices, hole = false) {
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(position[0], position[1], position[2]));
        transform.setRotation(new Ammo.btQuaternion(rotation[0], rotation[1], rotation[2], rotation[3]));
        const motionState = new Ammo.btDefaultMotionState(transform);

        const mesh = new Ammo.btTriangleMesh;
        mesh.setScaling(new Ammo.btVector3(scale[0], scale[1], scale[2]));
        for (let i = 0; i < indices.length / 3; ++i) {
            const a = indices[i * 3 + 0];
            const b = indices[i * 3 + 1];
            const c = indices[i * 3 + 2];
            this._vectorCache[0].setValue(vertices[a * 3 + 0], vertices[a * 3 + 1], vertices[a * 3 + 2]);
            this._vectorCache[1].setValue(vertices[b * 3 + 0], vertices[b * 3 + 1], vertices[b * 3 + 2]);
            this._vectorCache[2].setValue(vertices[c * 3 + 0], vertices[c * 3 + 1], vertices[c * 3 + 2]);
            mesh.addTriangle(
                this._vectorCache[0],
                this._vectorCache[1],
                this._vectorCache[2],
                false
            );
        }

        const shape = new Ammo.btBvhTriangleMeshShape(mesh, true, true);
        const localInertia = new Ammo.btVector3(0, 0, 0);

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, shape, localInertia);
        const object = new Ammo.btRigidBody(rbInfo);
        object.setRestitution(1);

        if (hole) {
            const minAABB = new Ammo.btVector3();
            const maxAABB = new Ammo.btVector3();
            object.getAabb(minAABB, maxAABB);
            Levels.ALL[(hole as any) - 1].holeAABB = [
                [minAABB.x(), minAABB.y(), minAABB.z()],
                [maxAABB.x(), maxAABB.y(), maxAABB.z()],
            ];
        }

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
        for (let i = 0; i < vertices.length / 3; ++i) {
            this._vectorCache[0].setValue(vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]);
            shape.addPoint(this._vectorCache[0]);
        }
        shape.setMargin(0);

        const localInertia = new Ammo.btVector3(0, 0, 0);

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, shape, localInertia);
        const object = new Ammo.btRigidBody(rbInfo);
        object.setRestitution(1);

        this._physicsWorld.addRigidBody(object);
    }

    private generateBallCollision() {
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(
            new Ammo.btVector3(
                Levels.ALL[Levels.CURRENT].spawnpoint[0],
                Levels.ALL[Levels.CURRENT].spawnpoint[1],
                Levels.ALL[Levels.CURRENT].spawnpoint[2]
            )
        );
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
        
        this._sphere.setRestitution(0.4);
        this._sphere.setDamping(0.5, 0.5);

        this._physicsWorld.addRigidBody(this._sphere);
    }

    private prepareLevel() {
        UI.flow('hole', 'Hole: ' + (Levels.CURRENT + 1));
        Levels.STROKES = 0;
        UI.flow('strokes', 'Strokes: ' + Levels.STROKES);

        const personalBest = +localStorage.getItem('best');
        if (personalBest) {
            UI.flow('personal-best', 'Personal Best: ' + personalBest);
        }

        this.resetBall();
    }

    private resetBall() {
        controls.target = Levels.ALL[Levels.CURRENT].spawnpoint;
        controls.direction = Levels.ALL[Levels.CURRENT].direction;
        controls.position = [
            controls.target[0] - controls.direction[0],
            controls.target[1] - controls.direction[1],
            controls.target[2] - controls.direction[2]
        ];
        
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(
            new Ammo.btVector3(
                Levels.ALL[Levels.CURRENT].spawnpoint[0],
                Levels.ALL[Levels.CURRENT].spawnpoint[1],
                Levels.ALL[Levels.CURRENT].spawnpoint[2]
            )
        );
        transform.setRotation(new Ammo.btQuaternion(0, 0, 0, 1));
        
        this._sphere.setWorldTransform(transform);
        this._sphere.getMotionState().setWorldTransform(transform);

        this._sphere.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
        this._sphere.setAngularVelocity(new Ammo.btVector3(0, 0, 0));

        this._scene.update(controls.target, [0, 0, 0, 1]);
        controls.update();
        
        this._state = State.READY;
    }

    private isBallInHole() {
        const AABB = Levels.ALL[Levels.CURRENT].holeAABB;
        return  (controls.target[0] >= AABB[0][0] && controls.target[0] <= AABB[1][0]) &&
                (controls.target[1] >= AABB[0][1] && controls.target[1] <= AABB[1][1] - 0.15) &&
                (controls.target[2] >= AABB[0][2] && controls.target[2] <= AABB[1][2]);
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

        if (e.code === 'KeyR') {
            this.resetBall();
            UI.flow('strokes', 'Strokes: ' + ++Levels.STROKES);
            UI.flow('all-strokes', 'All Strokes: ' + ++Levels.ALL_STROKES);
        }

        if ((window as any).DEBUG) {
            if (e.code === 'KeyT') {
                this._sphere.setLinearVelocity(new Ammo.btVector3(controls.direction[0] * 5, 0, controls.direction[2] * 5));
                this._state = State.MOVING;
            } else if (e.code === 'KeyZ') {
                this._sphere.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
                this._sphere.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
                this._state = State.READY;
            } else if (e.code === 'Space') {
                this._sphere.setLinearVelocity(new Ammo.btVector3(0, 5, 0));
                this._state = State.MOVING;
            } else if (e.code === 'KeyF') {
                console.log(controls.target);
                console.log(controls.direction);
                console.log(controls.up);
            }
        }
    }

    private keydown(e) {
        if (this._state === State.READY && e.keyCode === 83) {
            this._state = State.SHOOTING;
        }
    }

    private keyup(e) {
        if (this._state === State.SHOOTING && e.keyCode === 83) {
            this._state = State.MOVING;
            this._sphere.setLinearVelocity(
                new Ammo.btVector3(
                    controls.direction[0] * (this._currentForce * Engine.MAX_FORCE),
                    0,
                    controls.direction[2] * (this._currentForce * Engine.MAX_FORCE)
                )
            );
            this._currentForce = 0;
            this._forceDelta = Math.abs(this._forceDelta);
            UI.force(this._currentForce);
            
            UI.flow('strokes', 'Strokes: ' + ++Levels.STROKES);
            UI.flow('all-strokes', 'All Strokes: ' + ++Levels.ALL_STROKES);
        }
    }

    private loop(time) {
        // Clear the color buffer of the screen, otherwise we draw each frame on top of each other.
        gl.clearColor(0.37, 0.94, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if (this._state === State.SHOOTING) {
            this._currentForce += this._forceDelta;
            if (this._currentForce >= 1 || this._currentForce <= 0) {
                this._forceDelta = -this._forceDelta;
            }
            UI.force(this._currentForce);
        }

        if (this._running) {
            this._physicsWorld.stepSimulation(Engine.TIME_STEP, 2);

            const motionState = this._sphere.getMotionState();
            if (motionState) {
                motionState.getWorldTransform(this._transformCache[0]);
                const position = this._transformCache[0].getOrigin();
                const rotation = this._transformCache[0].getRotation();
                controls.target = [position.x(), position.y(), position.z()];
                this._scene.update(controls.target, [rotation.x(), rotation.y(), rotation.z(), rotation.w()]);
            }

            controls.update();

            if (this._state === State.MOVING) {
                if (this.isBallInHole()) {
                    this._state = State.FINISHING;
                    if (++Levels.CURRENT >= Levels.ALL.length) {
                        const personalBest = +localStorage.getItem('best');
                        if (!personalBest || (personalBest && Levels.ALL_STROKES < personalBest)) {
                            localStorage.setItem('best', String(Levels.ALL_STROKES));
                        }

                        Levels.CURRENT = 0;
                        Levels.STROKES = 0;
                        Levels.ALL_STROKES = 0;
                        UI.flow('strokes', 'Strokes: ' + Levels.STROKES);
                        UI.flow('all-strokes', 'All Strokes: ' + Levels.ALL_STROKES);
                    }
                    this.prepareLevel();
                } else if (this._sphere.getLinearVelocity().dot(this._sphere.getAngularVelocity()) === 0) {
                    this._state = State.READY;
                }
            }
        } else {
            if (controls.position[0] > -216) {
                controls.position[0] -= 0.01;
                controls.position[2] -= 0.01;
            }
        }

        mat4.lookAt(this._wMatrix, controls.position, controls.target, controls.up);

        this._scene.draw(this._pMatrix, this._wMatrix, controls.position);

        requestAnimationFrame(this.loop);
    }
}