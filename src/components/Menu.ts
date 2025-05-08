import * as PIXI from 'pixi.js';
import { Game } from '../Game';
import { Button } from './Button';

export class Menu extends PIXI.Container {
    private game: Game;
    private menuItems: { text: string; scene: string }[] = [
        { text: 'Ace of Shadows', scene: 'ace-of-shadows' },
        { text: 'Magic Words', scene: 'magic-words' },
        { text: 'Phoenix Flame', scene: 'phoenix-flame' }
    ];
    private background: PIXI.Graphics;
    private buttons: Button[] = [];

    constructor(game: Game) {
        super();
        this.game = game;
        this.createMenuItems();
    }

    private createMenuItems(): void {
        this.menuItems.forEach((item, index) => {
            const button = new Button(this.game.application, item.text, () => this.game.startScene(item.scene), {
                width: 200,
                height: 50,
                backgroundColor: 0xFDADD5,
                textColor: 0xFFFFFF,
                fontSize: 24
            });

            button.position.set(
                this.game.application.screen.width / 2 - 100, // Center horizontally (half of button width)
                this.game.application.screen.height / 2 - (this.menuItems.length * 60) / 2 + index * 60 // Center vertically with spacing
            );

            this.buttons.push(button);
            this.addChild(button);
        });
    }

    public updateLayout(): void {
        // Update button positions
        this.buttons.forEach((button, index) => {
            button.position.set(
                this.game.application.screen.width / 2 - 100,
                this.game.application.screen.height / 2 - (this.menuItems.length * 60) / 2 + index * 60
            );
        });
    }
} 