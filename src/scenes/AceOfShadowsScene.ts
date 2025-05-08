import * as PIXI from 'pixi.js';
import { Scene } from './Scene';

export class AceOfShadowsScene extends Scene {
    private cards: PIXI.Sprite[] = [];
    private stacks: PIXI.Container[] = [];
    private readonly NUM_CARDS = 144;
    private readonly NUM_STACKS = 2;
    private readonly CARD_OFFSET = 2;
    private readonly ANIMATION_DURATION = 2000;
    private readonly MOVE_INTERVAL = 1000;
    private movingToSecondStack = true;
    private lastMoveTime = 0;
    private isAnimating = false;
    private currentAnimation: {
        card: PIXI.Sprite;
        startX: number;
        startY: number;
        endX: number;
        endY: number;
        startTime: number;
    } | null = null;
    private tickerCallback: () => void;

    constructor(app: PIXI.Application) {
        super(app);
        this.tickerCallback = () => this.update();
        this.initialize();
    }

    private initialize(): void {
        const background = new PIXI.Graphics();
        background.beginFill(0x45b27b);
        background.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
        background.endFill();
        this.addChild(background);

        // Create stacks
        for (let i = 0; i < this.NUM_STACKS; i++) {
            const stack = new PIXI.Container();
            // Set anchor to center
            stack.pivot.set(0, 0);
            
            // Responsive spacing based on screen width
            const isMobile = this.app.screen.width <= 768;
            const cardWidth = isMobile ? 80 : 100;
            const stackSpacing = Math.min(this.app.screen.width * 0.3, 200);
            
            const verticalOffset = (this.NUM_CARDS * this.CARD_OFFSET) / 2;

            const startX = this.app.screen.width / 2 - cardWidth;
            stack.position.set(
                startX + (i * stackSpacing),
                (this.app.screen.height / 2) - verticalOffset
            );
            this.stacks.push(stack);
            this.addChild(stack);
        }

        // Create cards
        for (let i = 0; i < this.NUM_CARDS; i++) {
            const card = new PIXI.Sprite(PIXI.Texture.WHITE);

            const isMobile = this.app.screen.width <= 768;
            card.width = isMobile ? 80 : 100;
            card.height = isMobile ? 120 : 150;
            card.tint = Math.random() * 0xFFFFFF;
            card.anchor.set(0.5, 0.5);
            card.position.set(0, i * this.CARD_OFFSET);
            this.cards.push(card);
            this.stacks[0].addChild(card);
        }

        // Start animation loop
        this.app.ticker.add(this.tickerCallback);
    }

    public destroy(): void {
        // Remove ticker listener before destroying
        this.app.ticker.remove(this.tickerCallback);
        super.destroy({ children: true });
    }

    public update(): void {
        if (!this.parent) return;

        const currentTime = Date.now();

        // Check if it's time to start a new animation
        if (!this.isAnimating && currentTime - this.lastMoveTime >= (this.ANIMATION_DURATION + this.MOVE_INTERVAL)) {
            this.startNewAnimation();
        }

        // Update current animation
        if (this.isAnimating && this.currentAnimation) {
            const elapsed = currentTime - this.currentAnimation.startTime;
            const progress = Math.min(elapsed / this.ANIMATION_DURATION, 1);

            // Ease in-out function
            const easeProgress = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            // Update card position
            this.currentAnimation.card.position.set(
                this.currentAnimation.startX + (this.currentAnimation.endX - this.currentAnimation.startX) * easeProgress,
                this.currentAnimation.startY + (this.currentAnimation.endY - this.currentAnimation.startY) * easeProgress
            );

            // Check if animation is complete
            if (progress >= 1) {
                this.finishAnimation();
            }
        }
    }

    private startNewAnimation(): void {
        const sourceStack = this.movingToSecondStack ? this.stacks[0] : this.stacks[1];
        const targetStack = this.movingToSecondStack ? this.stacks[1] : this.stacks[0];

        if (sourceStack.children.length === 0) {
            this.movingToSecondStack = !this.movingToSecondStack;
            return;
        }

        const topCard = sourceStack.children[sourceStack.children.length - 1] as PIXI.Sprite;
        const targetY = targetStack.children.length * this.CARD_OFFSET;

        // Store the card's current position before removing it
        const cardWorldPos = topCard.getGlobalPosition();
        
        // Remove from source stack and add to main container
        sourceStack.removeChild(topCard);
        this.addChild(topCard);
        
        // Set the card's position in world coordinates
        topCard.position.set(cardWorldPos.x - this.x, cardWorldPos.y - this.y);

        // Calculate target position in world coordinates
        const targetWorldPos = targetStack.toGlobal(new PIXI.Point(0, targetY));
        const targetLocalPos = this.toLocal(targetWorldPos);

        this.currentAnimation = {
            card: topCard,
            startX: topCard.x,
            startY: topCard.y,
            endX: targetLocalPos.x,
            endY: targetLocalPos.y,
            startTime: Date.now()
        };

        this.isAnimating = true;
        this.lastMoveTime = Date.now();
    }

    private finishAnimation(): void {
        if (this.currentAnimation) {
            const targetStack = this.movingToSecondStack ? this.stacks[1] : this.stacks[0];
            
            // Remove from main container and add to target stack
            this.removeChild(this.currentAnimation.card);
            targetStack.addChild(this.currentAnimation.card);
            
            // Reset card position relative to target stack
            this.currentAnimation.card.position.set(0, targetStack.children.length * this.CARD_OFFSET);
            
            this.currentAnimation = null;
        }
        this.isAnimating = false;
    }
} 