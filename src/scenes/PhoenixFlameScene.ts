import * as PIXI from 'pixi.js';
import { Scene } from './Scene';

interface Particle {
    sprite: PIXI.Sprite;
    velocity: { x: number; y: number };
    life: number;
    maxLife: number;
}

export class PhoenixFlameScene extends Scene {
    private particles: Particle[] = [];
    private readonly MAX_PARTICLES = 10;
    private readonly PARTICLE_LIFETIME = 40;
    private readonly EMIT_INTERVAL = 80;
    private readonly INITIAL_SPRITE_SCALE = 0.8;
    private emitInterval: number | null = null;
    private tickerCallback: (delta: number) => void;
    private fireTextures: PIXI.Texture[] = [];
    private houseTexture: PIXI.Texture;
    private sunTexture: PIXI.Texture;
    private house!: PIXI.Sprite;

    constructor(app: PIXI.Application) {
        super(app);
        this.tickerCallback = delta => this.update(delta);
        this.houseTexture = PIXI.Texture.from('images/house.png');
        this.sunTexture = PIXI.Texture.from('images/sun.png');
        this.initialize();
    }

    private initialize(): void {
        // Load fire textures
        this.fireTextures = [
            PIXI.Texture.from('images/fire_1.png'),
            PIXI.Texture.from('images/fire_2.png'),
            PIXI.Texture.from('images/fire_3.png'),
        ];

        // Add error handling for texture loading
        this.fireTextures.forEach((texture, index) => {
            texture.baseTexture.on('error', () => {
                console.error(`Failed to load fire texture ${index + 1}`);
            });
        });

        // Add house sprite
        this.house = new PIXI.Sprite(this.houseTexture);
        this.house.anchor.set(0.5, 1); // Anchor at bottom center
        this.house.position.set(this.app.screen.width / 2, this.app.screen.height);
        this.house.scale.set(1);
        this.addChild(this.house);

        // Add sun sprite
        const sun = new PIXI.Sprite(this.sunTexture);
        sun.anchor.set(0.5);
        sun.position.set(this.app.screen.width - 200, 200);
        sun.scale.set(0.8);
        this.addChild(sun);

        // Start particle emission
        this.emitInterval = window.setInterval(() => this.emitParticle(), this.EMIT_INTERVAL);

        // Add update loop
        this.app.ticker.add(this.tickerCallback);
    }

    public destroy(): void {
        // Clear interval
        if (this.emitInterval !== null) {
            window.clearInterval(this.emitInterval);
            this.emitInterval = null;
        }

        // Remove ticker listener
        this.app.ticker.remove(this.tickerCallback);

        // Clean up particles
        this.particles.forEach(particle => {
            if (particle.sprite.parent) {
                particle.sprite.parent.removeChild(particle.sprite);
            }
            particle.sprite.destroy();
        });
        this.particles = [];

        super.destroy({ children: true });
    }

    private initializeParticle(sprite: PIXI.Sprite): { x: number; y: number } {
        // Set position at the top of the house
        const houseTop = this.house.y - this.house.height;
        sprite.position.set(this.house.x, houseTop);

        // Set velocity with more concentrated upward movement
        const angle = -Math.PI + Math.random() * Math.PI;
        const speed = 0.2 + Math.random();
        const velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed,
        };

        // Set random fire texture
        const randomTexture =
            this.fireTextures[Math.floor(Math.random() * this.fireTextures.length)];
        sprite.texture = randomTexture;

        // Set a fixed scale
        sprite.scale.set(this.INITIAL_SPRITE_SCALE);

        // Set transparency
        sprite.alpha = 0.8;

        return velocity;
    }

    private emitParticle(): void {
        if (!this.parent) return; // Skip if scene is being destroyed
        if (this.particles.length >= this.MAX_PARTICLES) {
            return;
        }

        const sprite = new PIXI.Sprite(this.fireTextures[0]); // Initial texture, will be changed in initializeParticle
        sprite.anchor.set(0.5);
        const velocity = this.initializeParticle(sprite);

        const particle: Particle = {
            sprite,
            velocity,
            life: 0,
            maxLife: this.PARTICLE_LIFETIME,
        };

        this.particles.push(particle);
        this.addChild(sprite);
    }

    public update(delta: number): void {
        if (!this.parent) return; // Skip update if scene is being destroyed

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.life += delta;

            if (particle.life >= particle.maxLife) {
                // Reset particle to starting values
                particle.velocity = this.initializeParticle(particle.sprite);
                particle.life = 0;
                continue;
            }

            // Update position
            particle.sprite.position.set(
                particle.sprite.x + particle.velocity.x,
                particle.sprite.y + particle.velocity.y
            );

            // Add some upward drift
            particle.velocity.y -= 0.025;

            // Progressively reduce scale
            const lifeRatio = particle.life / particle.maxLife;
            const newScale = this.INITIAL_SPRITE_SCALE * (1 - lifeRatio * 0.7); // Reduce to 30% of original size
            particle.sprite.scale.set(newScale);
        }
    }
}
