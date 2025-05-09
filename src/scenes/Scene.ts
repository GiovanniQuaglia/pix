import * as PIXI from 'pixi.js';

export abstract class Scene extends PIXI.Container {
    protected app: PIXI.Application;

    constructor(app: PIXI.Application) {
        super();
        this.app = app;
    }

    public abstract update(delta: number): void;
}
