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
    private emitInterval: number | null = null;
    private tickerCallback: (delta: number) => void;
    private particleTexture!: PIXI.Texture;
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
        // Create particle texture
        this.particleTexture = this.createParticleTexture();

        // Add house sprite
        this.house = new PIXI.Sprite(this.houseTexture);
        this.house.anchor.set(0.5, 1); // Anchor at bottom center
        this.house.position.set(this.app.screen.width / 2, this.app.screen.height);
        this.house.scale.set(1); // Doubled from 0.5 to 1
        this.addChild(this.house);

        // Add sun sprite
        const sun = new PIXI.Sprite(this.sunTexture);
        sun.anchor.set(0.5);
        sun.position.set(this.app.screen.width - 200, 200); // Position in top-right area
        sun.scale.set(0.8); // Doubled from 0.4 to 0.8
        this.addChild(sun);

        // Start particle emission
        this.emitInterval = window.setInterval(
            () => this.emitParticle(this.particleTexture),
            this.EMIT_INTERVAL
        );

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

    private createParticleTexture(): PIXI.Texture {
        const graphics = new PIXI.Graphics();
        graphics.beginFill(0xffffff);
        graphics.drawCircle(0, 0, 50);
        graphics.endFill();

        // Create texture from graphics
        return this.app.renderer.generateTexture(graphics);
    }

    private initializeParticle(sprite: PIXI.Sprite): { x: number; y: number } {
        // Set position at the top of the house
        const houseTop = this.house.y - this.house.height;
        sprite.position.set(this.house.x, houseTop);

        // Set velocity with more concentrated upward movement
        const angle = -Math.PI + Math.random() * Math.PI; // Mostly upward with small spread
        const speed = 1 + Math.random(); // Reduced speed range
        const velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed,
        };

        // Set color
        const hue = 20 + Math.random() * 20;
        const saturation = 80 + Math.random() * 20;
        const lightness = 50 + Math.random() * 20;
        sprite.tint = this.hslToHex(hue, saturation, lightness);

        return velocity;
    }

    private emitParticle(texture: PIXI.Texture): void {
        if (!this.parent) return; // Skip if scene is being destroyed
        if (this.particles.length >= this.MAX_PARTICLES) {
            return;
        }

        const sprite = new PIXI.Sprite(texture);
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
                particle.sprite.alpha = 1;
                particle.sprite.scale.set(1);
                continue;
            }

            // Update position
            particle.sprite.position.set(
                particle.sprite.x + particle.velocity.x,
                particle.sprite.y + particle.velocity.y
            );

            // Add some upward drift
            particle.velocity.y -= 0.05;

            // Fade out
            const lifeRatio = particle.life / particle.maxLife;
            particle.sprite.alpha = 1 - lifeRatio;
            particle.sprite.scale.set(1 - lifeRatio * 0.5);
        }
    }

    private hslToHex(h: number, s: number, l: number): number {
        s /= 100;
        l /= 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let r = 0,
            g = 0,
            b = 0;

        if (0 <= h && h < 60) {
            r = c;
            g = x;
            b = 0;
        } else if (60 <= h && h < 120) {
            r = x;
            g = c;
            b = 0;
        } else if (120 <= h && h < 180) {
            r = 0;
            g = c;
            b = x;
        } else if (180 <= h && h < 240) {
            r = 0;
            g = x;
            b = c;
        } else if (240 <= h && h < 300) {
            r = x;
            g = 0;
            b = c;
        } else if (300 <= h && h < 360) {
            r = c;
            g = 0;
            b = x;
        }

        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);

        return (r << 16) + (g << 8) + b;
    }
}
