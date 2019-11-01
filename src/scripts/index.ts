import '../styles/styles.scss';

import { Engine } from './engine/Engine';

window.onload = () => {
    const engine = new Engine(document.getElementById('game') as HTMLCanvasElement);
    engine.start();
};

console.log('Hello world!');
