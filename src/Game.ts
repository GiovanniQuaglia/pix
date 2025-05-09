import '@/styles/fonts.css';
import * as PIXI from 'pixi.js';
import { AceOfShadowsScene } from './scenes/AceOfShadowsScene';
import { MagicWordsScene } from './scenes/MagicWordsScene';
import { PhoenixFlameScene } from './scenes/PhoenixFlameScene';
import { Menu } from './components/Menu';
import { Button } from './components/Button';

// Define a base scene type
interface GameScene extends PIXI.Container {
    cleanup?: () => void;
    handleResize?: () => void;
}

const UI_CONFIG = {
    fpsCounter: {
        style: new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 16,
            fill: 0x333333,
        }),
        position: { x: 10, y: 10 },
    },
    backButton: {
        position: { x: 20, y: 20 },
        size: { width: 100, height: 40 },
    },
    title: {
        style: new PIXI.TextStyle({
            fontFamily: 'BowlbyOneSC',
            fontSize: 72,
            fill: 0x333333,
            align: 'center',
        }),
    },
};

export class Game {
    private app: PIXI.Application;
    private currentScene: GameScene | null = null;
    private menu: Menu;
    private backButton: Button;
    private fpsText: PIXI.Text;
    private uiLayer: PIXI.Container;
    private title: PIXI.Text = new PIXI.Text('');
    private resizeHandler: () => void;
    private scenes: Record<string, () => GameScene> = {
        'ace-of-shadows': () => new AceOfShadowsScene(this.app),
        'magic-words': () => new MagicWordsScene(this.app),
        'phoenix-flame': () => new PhoenixFlameScene(this.app),
    };

    constructor(app: PIXI.Application) {
        this.app = app;

        // Create UI layer
        this.uiLayer = new PIXI.Container();

        // Create title with initial empty text
        this.title = new PIXI.Text('', UI_CONFIG.title.style);
        this.title.anchor.set(0.5);
        this.title.position.set(this.app.screen.width / 2, this.app.screen.height / 2 - 200);
        this.uiLayer.addChild(this.title);

        // Wait for font to load before setting the text
        document.fonts.ready.then(() => {
            this.title.text = '3 Tests';
        });

        // Create back button using Button component
        this.backButton = new Button(app, '← Back', () => this.showMenu(), {
            width: UI_CONFIG.backButton.size.width,
            height: UI_CONFIG.backButton.size.height,
            backgroundColor: 0x337ea9,
            textColor: 0xffffff,
            fontSize: 20,
        });
        this.backButton.position.set(
            UI_CONFIG.backButton.position.x,
            UI_CONFIG.backButton.position.y
        );
        this.backButton.setVisible(false);

        // Add FPS counter
        this.fpsText = new PIXI.Text('FPS: 0', UI_CONFIG.fpsCounter.style);
        this.fpsText.anchor.set(1, 0);
        this.fpsText.position.set(
            app.screen.width - UI_CONFIG.fpsCounter.position.x,
            UI_CONFIG.fpsCounter.position.y
        );

        // Add UI elements to layer
        this.uiLayer.addChild(this.backButton);
        this.uiLayer.addChild(this.fpsText);

        // Create menu
        this.menu = new Menu(this);

        // Add everything to stage in correct order
        this.app.stage.addChild(this.menu);
        this.app.stage.addChild(this.uiLayer);

        // Update FPS counter
        this.app.ticker.add(() => {
            this.fpsText.text = `FPS: ${Math.round(this.app.ticker.FPS)}`;
        });

        // Set up resize handler
        this.resizeHandler = this.handleResize.bind(this);
        window.addEventListener('resize', this.resizeHandler);
    }

    private handleResize(): void {
        // Update title position
        this.title.position.set(this.app.screen.width / 2, this.app.screen.height / 2 - 150);

        // Update FPS counter position
        this.fpsText.position.set(
            this.app.screen.width - UI_CONFIG.fpsCounter.position.x,
            UI_CONFIG.fpsCounter.position.y
        );

        // Update back button position if needed
        this.backButton.position.set(
            UI_CONFIG.backButton.position.x,
            UI_CONFIG.backButton.position.y
        );

        // Update menu layout if needed
        this.menu.updateLayout?.();

        // Update current scene if it exists
        if (this.currentScene && typeof this.currentScene.handleResize === 'function') {
            this.currentScene.handleResize();
        }
    }

    public get application(): PIXI.Application {
        return this.app;
    }

    public initialize(): void {
        this.showMenu();
    }

    public startScene(sceneName: string): void {
        this.switchScene(sceneName);
    }

    private switchScene(sceneName: string): void {
        try {
            // Clean up current scene if it exists
            if (this.currentScene) {
                if (this.currentScene.cleanup) {
                    this.currentScene.cleanup();
                }
                this.app.stage.removeChild(this.currentScene);
                this.currentScene.destroy({ children: true });
            }

            // Create new scene
            this.currentScene = this.scenes[sceneName]();
            this.app.stage.addChild(this.currentScene);

            // Ensure UI layer is always on top
            this.app.stage.setChildIndex(this.uiLayer, this.app.stage.children.length - 1);

            this.menu.visible = false;
            this.backButton.setVisible(true);
            this.title.visible = false;
        } catch (error) {
            console.error(`Error switching to scene "${sceneName}":`, error);
            this.showMenu();
        }
    }

    public showMenu(): void {
        if (this.currentScene) {
            if (this.currentScene.cleanup) {
                this.currentScene.cleanup();
            }
            this.app.stage.removeChild(this.currentScene);
            this.currentScene.destroy({ children: true });
            this.currentScene = null;
        }
        this.menu.visible = true;
        this.backButton.setVisible(false);
        this.title.visible = true;

        // Ensure UI layer is always on top
        this.app.stage.setChildIndex(this.uiLayer, this.app.stage.children.length - 1);
    }

    public cleanup(): void {
        // Clean up current scene
        if (this.currentScene) {
            if (this.currentScene.cleanup) {
                this.currentScene.cleanup();
            }
            this.app.stage.removeChild(this.currentScene);
            this.currentScene.destroy({ children: true });
        }

        // Clean up UI elements
        this.uiLayer.destroy({ children: true });
        this.menu.destroy({ children: true });

        // Remove event listeners
        window.removeEventListener('resize', this.resizeHandler);
    }
}
