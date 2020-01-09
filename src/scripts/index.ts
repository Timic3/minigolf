import '../styles/styles.scss';

import { Engine } from './engine/Engine';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Ammo = require('ammo.js');

window.onload = async () => {
    const engine = new Engine('game');
    Ammo().then((Ammo) => {
        engine.start(Ammo);
    });
};

console.log('Hello world!');
