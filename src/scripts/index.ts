import '../styles/styles.scss';

import { Engine } from './engine/Engine';
import { vec3, quat } from 'gl-matrix';

window.onload = async () => {
    const engine = new Engine('game');
    engine.start();
    const dir = vec3.create();
    vec3.transformQuat(dir,
        vec3.fromValues(91.03907775878906, 115.02169799804688, -115.84750366210938),
        quat.fromValues(0.42054253816604614, 0.3577471971511841, 0.1078755334019661, 0.8267549872398376)
        //quat.fromValues(-0.7071067690849304, 0, 0, 0.7071067690849304)
    );
    console.log(dir);
    const alongNegativeZ = vec3.fromValues(0, 0, -1);
    vec3.transformQuat(dir, alongNegativeZ, quat.fromValues(0.07826986163854599, 0.248360738158226, -0.5660841464996338, 0.7821377515792847));
    console.log(dir);
};

console.log('Hello world!');
