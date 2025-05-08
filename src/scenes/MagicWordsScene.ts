import * as PIXI from 'pixi.js';
import { Scene } from './Scene';
import { Button } from '../components/Button';

interface DialogueLine {
    name: string;
    text: string;
}

interface Emoji {
    name: string;
    url: string;
    texture?: PIXI.Texture;
}

interface Avatar {
    name: string;
    url: string;
    position: 'left' | 'right';
    texture?: PIXI.Texture;
    sprite?: PIXI.Sprite;
}

interface DialogueData {
    dialogue: DialogueLine[];
    emojies: Emoji[];
    avatars: Avatar[];
}

export class MagicWordsScene extends Scene {
    private dialogueData: DialogueData | null = null;
    private currentLineIndex: number = 0;
    private dialogueText: PIXI.Text;
    private speakerName: PIXI.Text;
    private continueButton: Button;
    private restartButton: Button;
    private isAnimating: boolean = false;
    private currentCharIndex: number = 0;
    private emojiSprites: Map<string, PIXI.Sprite> = new Map();
    private avatarSprites: Map<string, PIXI.Sprite> = new Map();
    private currentAvatar: PIXI.Sprite | null = null;
    private loadingText: PIXI.Text;
    private isLoading: boolean = true;

    constructor(app: PIXI.Application) {
        super(app);
        
        // Initialize UI elements
        this.dialogueText = new PIXI.Text('');
        this.speakerName = new PIXI.Text('');
        this.continueButton = new Button(app, 'Continue', () => this.onContinueClick(), {
            width: 120,
            height: 40,
            backgroundColor: 0x4CAF50
        });
        
        // Add restart button
        this.restartButton = new Button(app, 'Restart', () => this.restartDialogue(), {
            width: 120,
            height: 40,
            backgroundColor: 0x4CAF50
        });
        this.restartButton.setVisible(false);
        
        // Add loading text
        this.loadingText = new PIXI.Text('Loading...', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0x333333,
            align: 'center'
        });
        this.loadingText.anchor.set(0.5);
        this.loadingText.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
        this.addChild(this.loadingText);
        
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            const response = await fetch('https://private-624120-softgamesassignment.apiary-mock.com/v2/magicwords');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            console.log('Received data:', data);
            console.log('Data structure:', {
                hasDialogue: Array.isArray(data?.dialogue),
                hasEmojies: Array.isArray(data?.emojies),
                hasAvatars: Array.isArray(data?.avatars),
                dialogueLength: data?.dialogue?.length,
                emojiesLength: data?.emojies?.length,
                avatarsLength: data?.avatars?.length
            });
            
            if (!this.isValidDialogueData(data)) {
                throw new Error('Invalid dialogue data format');
            }

            this.dialogueData = data;
            await this.preloadAssets();
            this.isLoading = false;
            this.removeChild(this.loadingText);
            this.setupUI();
            this.showCurrentLine();
        } catch (error) {
            console.error('Failed to fetch dialogue data:', error);
            const errorText = new PIXI.Text('Failed to load dialogue. Please try again later.', {
                fontFamily: 'Arial',
                fontSize: 24,
                fill: 0xFF0000,
                align: 'center'
            });
            errorText.anchor.set(0.5);
            errorText.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
            this.addChild(errorText);
        }
    }

    private async preloadAssets(): Promise<void> {
        if (!this.dialogueData) return;

        const totalAssets = this.dialogueData.emojies.length + this.dialogueData.avatars.length;
        let loadedAssets = 0;

        // Update loading text to show progress
        const updateLoadingProgress = () => {
            const progress = Math.round((loadedAssets / totalAssets) * 100);
            this.loadingText.text = `Loading... ${progress}%`;
        };

        // Preload emojis
        for (const emoji of this.dialogueData.emojies) {
            try {
                // Check if texture is already loaded
                const existingTexture = PIXI.Texture.from(emoji.url);
                if (existingTexture.valid) {
                    emoji.texture = existingTexture;
                } else {
                    const texture = await PIXI.Texture.fromURL(emoji.url);
                    emoji.texture = texture;
                }
                loadedAssets++;
                updateLoadingProgress();
            } catch (error) {
                console.error(`Failed to load emoji ${emoji.name}:`, error);
                // Retry once after a short delay
                try {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const texture = await PIXI.Texture.fromURL(emoji.url);
                    emoji.texture = texture;
                    loadedAssets++;
                    updateLoadingProgress();
                } catch (retryError) {
                    console.error(`Failed to load emoji ${emoji.name} after retry:`, retryError);
                }
            }
        }

        // Preload avatars
        for (const avatar of this.dialogueData.avatars) {
            try {
                // Check if texture is already loaded
                const existingTexture = PIXI.Texture.from(avatar.url);
                if (existingTexture.valid) {
                    avatar.texture = existingTexture;
                } else {
                    const texture = await PIXI.Texture.fromURL(avatar.url);
                    avatar.texture = texture;
                }
                
                // Create sprite only if texture was loaded successfully
                if (avatar.texture) {
                    const sprite = new PIXI.Sprite(avatar.texture);
                    sprite.anchor.set(0.5);
                    sprite.scale.set(0.5); // Adjust scale as needed
                    this.avatarSprites.set(avatar.name, sprite);
                }
                loadedAssets++;
                updateLoadingProgress();
            } catch (error) {
                console.error(`Failed to load avatar ${avatar.name}:`, error);
                // Retry once after a short delay
                try {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const texture = await PIXI.Texture.fromURL(avatar.url);
                    avatar.texture = texture;
                    if (avatar.texture) {
                        const sprite = new PIXI.Sprite(avatar.texture);
                        sprite.anchor.set(0.5);
                        sprite.scale.set(0.5);
                        this.avatarSprites.set(avatar.name, sprite);
                    }
                    loadedAssets++;
                    updateLoadingProgress();
                } catch (retryError) {
                    console.error(`Failed to load avatar ${avatar.name} after retry:`, retryError);
                }
            }
        }
    }

    private isValidDialogueData(data: any): data is DialogueData {
        return (
            data &&
            Array.isArray(data.dialogue) &&
            Array.isArray(data.emojies) &&
            Array.isArray(data.avatars) &&
            data.dialogue.every((line: any) => 
                typeof line.name === 'string' && 
                typeof line.text === 'string'
            ) &&
            data.emojies.every((emoji: any) => 
                typeof emoji.name === 'string' && 
                typeof emoji.url === 'string'
            ) &&
            data.avatars.every((avatar: any) => 
                typeof avatar.name === 'string' && 
                typeof avatar.url === 'string' && 
                (avatar.position === 'left' || avatar.position === 'right')
            )
        );
    }

    private setupUI(): void {
        // Create dialogue box
        const isMobile = this.app.screen.width <= 768; // Common mobile breakpoint
        const boxWidth = isMobile ? this.app.screen.width * 0.95 : this.app.screen.width * 0.4;
        const boxHeight = this.app.screen.height * 0.3;
        const boxX = (this.app.screen.width - boxWidth) / 2;
        // Position box higher above the character
        const characterHeight = isMobile ? this.app.screen.width * 0.2 : this.app.screen.width * 0.1;
        const boxY = this.app.screen.height - characterHeight - boxHeight - 60;

        const box = new PIXI.Graphics();
        box.beginFill(0xFFFFFF, 0.95); // White color with slight transparency
        box.drawRoundedRect(boxX, boxY, boxWidth, boxHeight, 15);
        box.endFill();
        this.addChild(box);

        // Create speaker name text
        this.speakerName = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0x333333,
            fontWeight: 'bold'
        });
        this.speakerName.position.set(boxX + 20, boxY + 20);
        this.addChild(this.speakerName);

        // Create dialogue text
        this.dialogueText = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 0x333333,
            wordWrap: true,
            wordWrapWidth: boxWidth - 40
        });
        this.dialogueText.position.set(boxX + 20, boxY + 60);
        this.addChild(this.dialogueText);

        // Position continue button
        this.continueButton.position.set(
            boxX + boxWidth - 140,
            boxY + boxHeight - 60
        );
        this.continueButton.setVisible(false);
        this.addChild(this.continueButton);

        // Position restart button
        this.restartButton.position.set(
            boxX + boxWidth - 140,
            boxY + boxHeight - 60
        );
        this.addChild(this.restartButton);
    }

    private updateAvatar(speakerName: string): void {
        // Remove current avatar if it exists
        if (this.currentAvatar) {
            this.removeChild(this.currentAvatar);
            this.currentAvatar.destroy();
            this.currentAvatar = null;
        }

        // Get the new avatar sprite
        const newAvatar = this.avatarSprites.get(speakerName);
        if (newAvatar) {
            // Create a new sprite instance to avoid scaling issues
            const sprite = new PIXI.Sprite(newAvatar.texture);
            
            // Calculate size based on screen width (10% on mobile, 5% on desktop)
            const isMobile = this.app.screen.width <= 768;
            const targetWidth = isMobile ? this.app.screen.width * 0.3 : this.app.screen.width * 0.1;
            const scale = targetWidth / sprite.width;
            sprite.scale.set(scale);

            // Position the avatar at the bottom center of the screen
            sprite.position.set(
                this.app.screen.width / 2, // Center horizontally
                this.app.screen.height // Bottom of screen
            );
            sprite.anchor.set(0.5, 1); // Anchor at bottom center

            this.addChild(sprite);
            this.currentAvatar = sprite;
        }
    }

    private showCurrentLine(): void {
        if (!this.dialogueData || this.currentLineIndex >= this.dialogueData.dialogue.length) {
            this.dialogueText.text = 'End of dialogue';
            this.speakerName.text = '';
            this.continueButton.setVisible(false);
            this.restartButton.setVisible(true);
            if (this.currentAvatar) {
                this.removeChild(this.currentAvatar);
                this.currentAvatar = null;
            }
            return;
        }

        const currentLine = this.dialogueData.dialogue[this.currentLineIndex];
        this.speakerName.text = currentLine.name;
        this.continueButton.setVisible(false);
        this.restartButton.setVisible(false);
        this.isAnimating = true;
        this.currentCharIndex = 0;

        // Update avatar for current speaker
        this.updateAvatar(currentLine.name);

        // Parse text and emojis
        const { text, emojis } = this.parseTextWithEmojis(currentLine.text);
        this.animateText(text, emojis);
    }

    private parseTextWithEmojis(text: string): { text: string; emojis: { name: string; index: number }[] } {
        const emojiRegex = /{([^}]+)}/g;
        const emojis: { name: string; index: number }[] = [];
        let match;
        let lastIndex = 0;
        let parsedText = '';

        while ((match = emojiRegex.exec(text)) !== null) {
            const emojiName = match[1];
            parsedText += text.slice(lastIndex, match.index) + '      '; // Add four spaces for emoji placement
            emojis.push({ name: emojiName, index: parsedText.length - 2 }); // Position in middle of spaces
            lastIndex = match.index + match[0].length;
        }
        parsedText += text.slice(lastIndex);

        return { text: parsedText, emojis };
    }

    private animateText(text: string, emojis: { name: string; index: number }[]): void {
        let currentIndex = 0;
        this.dialogueText.text = '';

        const animate = () => {
            if (currentIndex < text.length) {
                this.dialogueText.text += text[currentIndex];
                
                // Check if we need to add an emoji
                const emojiToAdd = emojis.find(e => e.index === currentIndex);
                if (emojiToAdd) {
                    const emoji = this.dialogueData?.emojies.find(e => e.name === emojiToAdd.name);
                    if (emoji?.texture) {
                        const sprite = new PIXI.Sprite(emoji.texture);
                        const textHeight = Number(this.dialogueText.style.fontSize || 20);
                        sprite.scale.set((textHeight / Number(sprite.height)) * 1.2);
                        sprite.position.set(
                            this.dialogueText.x + this.dialogueText.width + 10, // More spacing
                            this.dialogueText.y + (textHeight / 2) - (textHeight * 0.5) // Raise by 50% of text height
                        );
                        this.addChild(sprite);
                        this.emojiSprites.set(emojiToAdd.name, sprite);
                    }
                }

                currentIndex++;
                setTimeout(animate, 10);
            } else {
                this.isAnimating = false;
                this.continueButton.setVisible(true);
            }
        };

        animate();
    }

    private onContinueClick(): void {
        this.nextLine();
    }

    private restartDialogue(): void {
        // Reset all state
        this.currentLineIndex = 0;
        this.isAnimating = false;
        this.currentCharIndex = 0;
        
        // Clean up emoji sprites
        this.emojiSprites.forEach(sprite => {
            if (sprite.parent) {
                sprite.parent.removeChild(sprite);
            }
            sprite.destroy();
        });
        this.emojiSprites.clear();

        // Hide restart button and show continue button
        this.restartButton.setVisible(false);
        this.continueButton.setVisible(false);

        // Start the dialogue from the beginning
        this.showCurrentLine();
    }

    private nextLine(): void {
        if (!this.dialogueData) return;

        // Clean up previous emoji sprites
        this.emojiSprites.forEach(sprite => {
            if (sprite.parent) {
                sprite.parent.removeChild(sprite);
            }
            sprite.destroy();
        });
        this.emojiSprites.clear();

        this.currentLineIndex++;
        if (this.currentLineIndex < this.dialogueData.dialogue.length) {
            this.startNewLine();
        } else {
            this.dialogueText.text = "End of dialogue";
            this.speakerName.text = "";
            this.continueButton.setVisible(false);
            this.restartButton.setVisible(true);
            if (this.currentAvatar) {
                this.removeChild(this.currentAvatar);
                this.currentAvatar = null;
            }
        }
    }

    private startNewLine(): void {
        if (!this.dialogueData) return;

        const line = this.dialogueData.dialogue[this.currentLineIndex];
        this.speakerName.text = line.name;
        this.dialogueText.text = '';
        this.isAnimating = true;
        this.currentCharIndex = 0;
        this.continueButton.setVisible(false);
        this.restartButton.setVisible(false);

        // Update avatar for current speaker
        this.updateAvatar(line.name);

        // Parse and animate the new line
        const { text, emojis } = this.parseTextWithEmojis(line.text);
        this.animateText(text, emojis);
    }

    public update(): void {
        if (this.isLoading) return;
        
        if (this.isAnimating && this.dialogueData) {
            const line = this.dialogueData.dialogue[this.currentLineIndex];
            const { text, emojis } = this.parseTextWithEmojis(line.text);
            
            if (this.currentCharIndex < text.length) {
                this.dialogueText.text += text[this.currentCharIndex];
                
                // Check if we need to add an emoji
                const emojiToAdd = emojis.find(e => e.index === this.currentCharIndex);
                if (emojiToAdd) {
                    const emoji = this.dialogueData.emojies.find(e => e.name === emojiToAdd.name);
                    if (emoji?.texture) {
                        const sprite = new PIXI.Sprite(emoji.texture);
                        const textHeight = Number(this.dialogueText.style.fontSize || 16);
                        sprite.scale.set((textHeight / Number(sprite.height)) * 1.2); // Scale emoji to be 1.2x text height
                        sprite.position.set(
                            this.dialogueText.x + this.dialogueText.width + 10, // More spacing
                            this.dialogueText.y + (textHeight / 2) - (textHeight * 0.5) // Raise by 50% of text height
                        );
                        this.addChild(sprite);
                        this.emojiSprites.set(emojiToAdd.name, sprite);
                    }
                }
                
                this.currentCharIndex++;
            } else {
                this.isAnimating = false;
                this.continueButton.setVisible(true);
            }
        }
    }

    public destroy(): void {
        // Clean up emoji sprites
        this.emojiSprites.forEach(sprite => {
            if (sprite.parent) {
                sprite.parent.removeChild(sprite);
            }
            sprite.destroy();
        });
        this.emojiSprites.clear();

        // Clean up avatar sprites
        this.avatarSprites.forEach(sprite => {
            if (sprite.parent) {
                sprite.parent.removeChild(sprite);
            }
            sprite.destroy();
        });
        this.avatarSprites.clear();

        super.destroy({ children: true });
    }
} 