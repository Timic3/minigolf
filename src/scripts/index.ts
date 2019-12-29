import '../styles/styles.scss';

import { Engine } from './engine/Engine';

window.onload = async () => {
    const engine = new Engine('game');
    engine.start();
};

console.log('Hello world!');
