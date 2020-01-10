import '../styles/styles.scss';

import { Engine } from './engine/Engine';
import { UI } from './engine/utils/UI';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Ammo = require('ammo.js');

(window as any).DEBUG = true;

window.onload = async () => {
    UI.flow('loading', 'Canvas');
    const engine = new Engine('game');
    UI.initialize(engine);
    UI.flow('loading', 'Physics Engine');
    Ammo().then((Ammo) => {
        engine.start(Ammo);
    });
};

console.log('Welcome to Mini Golf!');
