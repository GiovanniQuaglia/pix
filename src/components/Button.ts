import * as PIXI from 'pixi.js';

export class Button extends PIXI.Container {
    private background: PIXI.Sprite;
    private text: PIXI.Text;
    private readonly padding: number = 20;

    constructor(
        app: PIXI.Application,
        text: string,
        onClick: () => void,
        options: {
            width?: number;
            height?: number;
            backgroundColor?: number;
            textColor?: number;
            fontSize?: number;
        } = {}
    ) {
        super();

        // Create text first to measure it
        this.text = new PIXI.Text(text, {
            fontFamily: 'Arial',
            fontSize: options.fontSize || 20,
            fill: options.textColor || 0xffffff,
            align: 'center',
        });

        // Create background sprite
        const width = options.width || this.text.width + this.padding * 2;
        const height = options.height || this.text.height + this.padding * 2;

        const graphics = new PIXI.Graphics();
        graphics.beginFill(options.backgroundColor || 0x333333);
        graphics.drawRoundedRect(0, 0, width, height, 10);
        graphics.endFill();

        const texture = app.renderer.generateTexture(graphics);
        this.background = new PIXI.Sprite(texture);
        this.addChild(this.background);

        // Center text on background
        this.text.anchor.set(0.5);
        this.text.position.set(width / 2, height / 2);
        this.addChild(this.text);

        // Make interactive
        this.eventMode = 'static';
        this.cursor = 'pointer';
        this.on('pointerdown', onClick);

        // Add hover effect
        this.on('pointerover', () => {
            this.background.tint = 0xeeeeee;
        });
        this.on('pointerout', () => {
            this.background.tint = 0xffffff;
        });
    }

    public setText(newText: string): void {
        this.text.text = newText;
    }

    public setVisible(visible: boolean): void {
        this.visible = visible;
    }
}
