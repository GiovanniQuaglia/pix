import * as PIXI from 'pixi.js';
import { Game } from './Game';

const app = new PIXI.Application({
    view: document.createElement('canvas'),
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x86f0dd,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
});

document.getElementById('app')?.appendChild(app.view as HTMLCanvasElement);

window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
});

const game = new Game(app);
game.initialize();
